import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_LANG } from "@/lib/i18n";

export async function POST(req: NextRequest) {
  const { lang } = await req.json();
  if (lang !== "EN" && lang !== "UR") {
    return NextResponse.json({ error: "Invalid language." }, { status: 400 });
  }
  const store = await cookies();
  store.set(COOKIE_LANG, lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return NextResponse.json({ ok: true });
}
