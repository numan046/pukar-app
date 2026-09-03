import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listDepartments, listAllDepartments, createDepartment, getDepartment,
  countComplaintsByDepartment, countEmployeesByDepartment, getUserById,
  listUsersByRole,
} from "@/lib/db/repo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const departments = user.role === "SUPER_ADMIN" ? await listAllDepartments() : await listDepartments();

  const enriched = await Promise.all(departments.map(async (d) => {
    const officer = d.officer_id ? await getUserById(d.officer_id) : null;
    return {
      ...d,
      officer_name: officer?.name ?? null,
      complaint_count: await countComplaintsByDepartment(d.id),
      employee_count: await countEmployeesByDepartment(d.id),
    };
  }));

  return NextResponse.json({ departments: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admin can create departments." }, { status: 403 });
  }

  const { name, slug, description } = await req.json();
  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
  }

  try {
    const dept = await createDepartment(name, slug, description);
    return NextResponse.json({ department: dept });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create department. Slug may already exist." }, { status: 400 });
  }
}
