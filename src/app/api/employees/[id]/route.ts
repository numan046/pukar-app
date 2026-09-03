import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, updateUser, deactivateUser, reactivateUser } from "@/lib/db/repo";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const employee = await getUserById(params.id);
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  // Officers can only manage their own department employees
  if (user.role === "DEPARTMENT_OFFICER" && employee.department_id !== user.departmentId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "DEPARTMENT_OFFICER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { name, phone, designation } = await req.json();
  await updateUser(params.id, {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(designation !== undefined && { designation }),
  });

  return NextResponse.json({ employee: await getUserById(params.id) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const employee = await getUserById(params.id);
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  if (user.role === "DEPARTMENT_OFFICER" && employee.department_id !== user.departmentId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "DEPARTMENT_OFFICER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { action } = await req.json().catch(() => ({ action: "deactivate" }));
  if (action === "reactivate") {
    await reactivateUser(params.id);
  } else {
    await deactivateUser(params.id);
  }

  return NextResponse.json({ success: true });
}
