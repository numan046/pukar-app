import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listCmos } from "@/lib/db/repo";

// GET: List all CMOs (accessible by CM and SUPER_ADMIN)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "CM" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const cmos = await listCmos();
  return NextResponse.json({ cmos });
}
