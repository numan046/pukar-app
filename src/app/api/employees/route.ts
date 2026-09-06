import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listEmployeesByDepartment, listEmployeesByDepartmentAndDistrict, listUsersByRole, createUser, getUserById } from "@/lib/db/repo";
import { hashPassword } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // CMO: Return all officers and employees in their department
  if (user.role === "CMO") {
    if (!user.departmentId) return NextResponse.json({ employees: [] });
    const officers = await listUsersByRole("DEPARTMENT_OFFICER");
    const employees = await listUsersByRole("EMPLOYEE");
    // Filter to only those in the CMO's department
    const deptOfficers = officers.filter(o => o.department_id === user.departmentId);
    const deptEmployees = employees.filter(e => e.department_id === user.departmentId);
    return NextResponse.json({ employees: [...deptOfficers, ...deptEmployees] });
  }

  if (user.role === "DEPARTMENT_OFFICER") {
    if (!user.departmentId) return NextResponse.json({ employees: [] });
    // If officer has a district, only show employees in their district
    const employees = user.districtId
      ? await listEmployeesByDepartmentAndDistrict(user.departmentId, user.districtId)
      : await listEmployeesByDepartment(user.departmentId);
    return NextResponse.json({ employees });
  }

  if (user.role === "SUPER_ADMIN") {
    const employees = await listUsersByRole("EMPLOYEE");
    return NextResponse.json({ employees });
  }

  return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "DEPARTMENT_OFFICER" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { name, email, phone, designation, departmentId } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const deptId = departmentId ?? user.departmentId;
  if (!deptId) {
    return NextResponse.json({ error: "Department is required." }, { status: 400 });
  }

  // Generate temporary password
  const tempPassword = "Temp" + newId("pwd").slice(0, 8) + "!";
  const passwordHash = hashPassword(tempPassword);

  try {
    const employee = await createUser({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: "EMPLOYEE",
      phone: phone ?? null,
      department_id: deptId,
      district_id: user.districtId ?? null,
      designation: designation ?? null,
      language: "EN",
      is_active: 1,
      must_change_password: 1,
    });

    return NextResponse.json({
      employee: { id: employee.id, name: employee.name, email: employee.email, role: employee.role, designation: employee.designation },
      tempPassword,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create employee. Email may already exist." }, { status: 400 });
  }
}
