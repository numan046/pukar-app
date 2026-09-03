import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getComplaintById } from "@/lib/db/repo";
import { employeeMarkResolved } from "@/lib/workflow";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Only employees can mark complaints as resolved." }, { status: 403 });
  }

  const complaint = await getComplaintById(params.id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  if (complaint.assigned_employee_id !== user.id) {
    return NextResponse.json({ error: "This complaint is not assigned to you." }, { status: 403 });
  }

  try {
    const { resolutionNote, proofData } = await req.json();
    if (!resolutionNote) return NextResponse.json({ error: "Resolution note is required." }, { status: 400 });
    if (!proofData) return NextResponse.json({ error: "Proof is required (image or video)." }, { status: 400 });

    await employeeMarkResolved(params.id, user.id, resolutionNote, typeof proofData === "string" ? proofData : JSON.stringify(proofData));
    return NextResponse.json({ complaint: await getComplaintById(params.id) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to resolve complaint.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
