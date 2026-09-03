import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { askPprAi } from "@/lib/ai";

const AUTHORIZED_ROLES = ["SUPER_ADMIN", "DEPARTMENT_OFFICER"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!AUTHORIZED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Ask Pukar AI is available to admin and officer roles." }, { status: 403 });
  }
  const { question } = await req.json();
  if (!question || String(question).trim().length < 3) {
    return NextResponse.json({ error: "Please ask a specific question." }, { status: 400 });
  }
  const answer = await askPprAi(question);
  return NextResponse.json({ answer });
}
