import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getComplaintById } from "@/lib/db/repo";
import { employeeStartWork, employeeAddProgress } from "@/lib/workflow";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Only employees can add progress." }, { status: 403 });
  }

  const complaint = await getComplaintById(params.id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  if (complaint.assigned_employee_id !== user.id) {
    return NextResponse.json({ error: "This complaint is not assigned to you." }, { status: 403 });
  }

  try {
    const { action, message, proofData } = await req.json();

    if (action === "start_work") {
      await employeeStartWork(params.id, user.id);
    } else if (action === "add_progress") {
      if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
      await employeeAddProgress(params.id, user.id, message, proofData);
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    return NextResponse.json({ complaint: await getComplaintById(params.id) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update progress.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
