import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateExecutiveBrief } from "@/lib/ai";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  return NextResponse.json({ brief: await generateExecutiveBrief() });
}
