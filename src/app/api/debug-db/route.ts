import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/repo";

export async function GET() {
  const logs: string[] = [];

  try {
    logs.push("1. Testing getUserByEmail('citizen@ppr.ai')...");
    const start = Date.now();
    const user = await getUserByEmail("citizen@ppr.ai");
    const elapsed = Date.now() - start;
    logs.push(`   Done in ${elapsed}ms`);
    logs.push(`   User found: ${!!user}`);
    if (user) {
      logs.push(`   User: ${user.id}, ${user.name}, ${user.email}`);
    }

    return NextResponse.json({ success: true, logs });
  } catch (err) {
    logs.push(`   ERROR: ${err instanceof Error ? err.message : String(err)}`);
    logs.push(`   Stack: ${err instanceof Error ? err.stack?.split("\n").slice(0, 5).join(" | ") : ""}`);
    return NextResponse.json({ success: false, logs });
  }
}
