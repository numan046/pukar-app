import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createUser } from "@/lib/db/repo";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter and one number." }, { status: 400 });
    }
    if (await getUserByEmail(email)) {
      return NextResponse.json({ error: "Unable to create account. If this email is already registered, try signing in." }, { status: 409 });
    }
    // Public self-signup is always CITIZEN; government roles are provisioned by an Admin.
    const user = await createUser({
      name,
      email,
      password_hash: hashPassword(password),
      role: "CITIZEN",
      phone: null,
      department_id: null,
      district_id: null,
      designation: null,
      language: "EN",
      is_active: 1,
      must_change_password: 0,
    });
    await setSessionCookie(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
  }
}
