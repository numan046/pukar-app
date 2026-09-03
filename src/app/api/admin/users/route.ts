import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listAllUsers, createUser, updateUser, deactivateUser,
  listDepartments, getUserById,
} from "@/lib/db/repo";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const users = await listAllUsers();
  const departments = await listDepartments();

  // Strip password_hash before sending to client and add department_name
  const safeUsers = users.map(({ password_hash, ...u }: any) => {
    const dept = departments.find((d: any) => d.id === u.department_id);
    return { ...u, department_name: dept?.name ?? null };
  });

  return NextResponse.json({ users: safeUsers, departments });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { name, email, password, role, phone, department_id, designation } = await req.json();
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Name, email, password, and role are required." }, { status: 400 });
  }

  try {
    const newUser = await createUser({
      name,
      email: email.toLowerCase(),
      password_hash: hashPassword(password),
      role,
      phone: phone ?? null,
      department_id: department_id ?? null,
      district_id: null,
      designation: designation ?? null,
      language: "EN",
      is_active: 1,
      must_change_password: 0,
    });
    return NextResponse.json({ user: (() => { const { password_hash, ...u }: any = newUser; return u; })() });
  } catch {
    return NextResponse.json({ error: "Failed to create user. Email may already exist." }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { userId, name, email, role, phone, department_id, designation } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  await updateUser(userId, {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(role !== undefined && { role }),
    ...(phone !== undefined && { phone }),
    ...(department_id !== undefined && { department_id }),
    ...(designation !== undefined && { designation }),
  });

  const updated = await getUserById(userId);
  const safeUser = updated ? (({ password_hash, ...u }: any) => u)(updated) : null;
  return NextResponse.json({ user: safeUser });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
  if (userId === user.id) return NextResponse.json({ error: "Cannot deactivate yourself." }, { status: 400 });

  await deactivateUser(userId);
  return NextResponse.json({ success: true });
}
