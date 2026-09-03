import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getComplaintById } from "@/lib/db/repo";
import { officerHandleDispute } from "@/lib/workflow";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "DEPARTMENT_OFFICER") {
    return NextResponse.json({ error: "Only department officers can handle disputes." }, { status: 403 });
  }

  const complaint = await getComplaintById(params.id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  if (complaint.department_id !== user.departmentId) {
    return NextResponse.json({ error: "This complaint does not belong to your department." }, { status: 403 });
  }

  try {
    const { action, newEmployeeId, note } = await req.json();
    const validActions = ["RETURN_TO_IN_PROGRESS", "REASSIGN", "KEEP_UNDER_REVIEW", "RESOLVE_MANUALLY"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Action must be one of: ${validActions.join(", ")}` }, { status: 400 });
    }

    await officerHandleDispute(params.id, user.id, action, newEmployeeId, note);
    return NextResponse.json({ complaint: await getComplaintById(params.id) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to handle dispute.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
