import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDepartment, setDepartmentOfficer, getUserById, updateUser } from "@/lib/db/repo";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const dept = await getDepartment(params.id);
  if (!dept) return NextResponse.json({ error: "Department not found." }, { status: 404 });

  const { officerId } = await req.json();
  if (!officerId) {
    // Remove officer from department
    await setDepartmentOfficer(params.id, null);
    return NextResponse.json({ department: await getDepartment(params.id) });
  }

  const officer = await getUserById(officerId);
  if (!officer || officer.role !== "DEPARTMENT_OFFICER") {
    return NextResponse.json({ error: "User must be a Department Officer." }, { status: 400 });
  }

  // Assign officer to department
  await setDepartmentOfficer(params.id, officerId);
  // Also set department on the officer's user record
  await updateUser(officerId, { department_id: params.id });

  return NextResponse.json({ department: await getDepartment(params.id) });
}
