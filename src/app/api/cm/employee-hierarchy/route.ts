import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listAllDepartments, listCmos, listOfficersByDepartment,
  listEmployeesByDepartment, listEmployeesByDepartmentAndDistrict,
  listDistricts, getUserById,
} from "@/lib/db/repo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "CM" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const departments = await listAllDepartments();
  const districts = await listDistricts();

  // Build hierarchy: Department → CMOs → District Officers → Employees
  const hierarchy = await Promise.all(departments.map(async (dept) => {
    const cmos = await listCmos(dept.id);

    const cmosWithOfficers = await Promise.all(cmos.map(async (cmo) => {
      // Get all district officers in this department
      const officers = await listOfficersByDepartment(dept.id);

      const officersWithEmployees = await Promise.all(officers.map(async (officer) => {
        // Get employees in this officer's district
        const employees = officer.district_id
          ? await listEmployeesByDepartmentAndDistrict(dept.id, officer.district_id)
          : await listEmployeesByDepartment(dept.id);

        const district = districts.find(d => d.id === officer.district_id);

        return {
          id: officer.id,
          name: officer.name,
          email: officer.email,
          phone: officer.phone,
          designation: officer.designation,
          district_id: officer.district_id,
          district_name: district?.name ?? "All Districts",
          employee_count: employees.length,
          employees: employees.map(e => ({
            id: e.id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            designation: e.designation,
          })),
        };
      }));

      return {
        id: cmo.id,
        name: cmo.name,
        email: cmo.email,
        phone: cmo.phone,
        officer_count: officers.length,
        officers: officersWithEmployees,
      };
    }));

    return {
      id: dept.id,
      name: dept.name,
      slug: dept.slug,
      cmo_count: cmos.length,
      cmos: cmosWithOfficers,
    };
  }));

  return NextResponse.json({ hierarchy });
}
