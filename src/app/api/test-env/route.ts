import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL || "";
    const token = process.env.TURSO_AUTH_TOKEN || "";
    const httpsUrl = url.replace("libsql://", "https://");
    const apiUrl = `${httpsUrl}/v2/pipeline`;

    const body = JSON.stringify({
      requests: [{ type: "execute", stmt: { sql: "SELECT 1 as test", args: [] } }],
    });

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({
        status: res.status,
        rawText: text.substring(0, 200),
        error: "Response is not valid JSON",
      });
    }

    return NextResponse.json({
      status: res.status,
      parsed: parsed,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
