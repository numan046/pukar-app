import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getComplaintById } from "@/lib/db/repo";
import { citizenVerify } from "@/lib/workflow";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CITIZEN") {
    return NextResponse.json({ error: "Only citizens can verify complaints." }, { status: 403 });
  }

  const complaint = await getComplaintById(params.id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  if (complaint.citizen_id !== user.id) {
    return NextResponse.json({ error: "This is not your complaint." }, { status: 403 });
  }

  try {
    const { response, remarks } = await req.json();
    if (response !== "YES" && response !== "NO") {
      return NextResponse.json({ error: "Response must be YES or NO." }, { status: 400 });
    }

    await citizenVerify(params.id, user.id, response, remarks);
    return NextResponse.json({ complaint: await getComplaintById(params.id) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to submit verification.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
