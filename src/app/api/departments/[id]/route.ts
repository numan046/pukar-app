import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDepartment, updateDepartment, setDepartmentOfficer, getUserById } from "@/lib/db/repo";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const dept = await getDepartment(params.id);
  if (!dept) return NextResponse.json({ error: "Department not found." }, { status: 404 });

  const body = await req.json();
  const { name, slug, description, is_active } = body;

  await updateDepartment(params.id, {
    ...(name !== undefined && { name }),
    ...(slug !== undefined && { slug }),
    ...(description !== undefined && { description }),
    ...(is_active !== undefined && { is_active: is_active ? 1 : 0 }),
  });

  return NextResponse.json({ department: await getDepartment(params.id) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const dept = await getDepartment(params.id);
  if (!dept) return NextResponse.json({ error: "Department not found." }, { status: 404 });

  await updateDepartment(params.id, { is_active: 0 });
  return NextResponse.json({ success: true });
}
