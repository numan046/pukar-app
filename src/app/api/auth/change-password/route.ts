import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, updateUserPassword } from "@/lib/db/repo";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: "New password must contain at least one uppercase letter and one number." }, { status: 400 });
    }

    const user = await getUserById(sessionUser.id);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (!verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }

    const newHash = hashPassword(newPassword);
    await updateUserPassword(user.id, newHash);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unable to change password right now." }, { status: 500 });
  }
}
