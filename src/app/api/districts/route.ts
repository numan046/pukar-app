import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDistricts, getDistrict } from "@/lib/db/repo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const districts = await listDistricts();
  return NextResponse.json({ districts });
}
