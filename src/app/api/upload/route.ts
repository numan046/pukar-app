import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — Vercel body limit is 4.5MB; base64 stored in DB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large (max 3MB)." }, { status: 400 });
    }

    // Convert to base64 data URL — works on Vercel's ephemeral filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ url: dataUrl, type: file.type });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
