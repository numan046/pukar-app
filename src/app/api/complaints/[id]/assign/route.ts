import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getComplaintById, getUserById, updateComplaint, addComplaintHistory, createNotification } from "@/lib/db/repo";
import { officerAssignEmployee } from "@/lib/workflow";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const complaint = await getComplaintById(params.id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });

  // CMO can assign officers to complaints
  if (user.role === "CMO") {
    if (complaint.department_id !== user.departmentId) {
      return NextResponse.json({ error: "This complaint does not belong to your department." }, { status: 403 });
    }
    const { officerId } = await req.json();
    if (!officerId) {
      return NextResponse.json({ error: "Officer ID is required." }, { status: 400 });
    }
    const officer = await getUserById(officerId);
    if (!officer || officer.role !== "DEPARTMENT_OFFICER") {
      return NextResponse.json({ error: "Officer not found." }, { status: 404 });
    }
    await updateComplaint(params.id, { assigned_officer_id: officerId, status: "ASSIGNED" });
    await addComplaintHistory({
      complaint_id: params.id,
      user_id: user.id,
      action: "OFFICER_ASSIGNED",
      old_status: complaint.status,
      new_status: "ASSIGNED",
      description: `CMO assigned officer ${officer.name} to this complaint`,
    });
    await createNotification({
      user_id: officerId,
      complaint_id: params.id,
      type: "NEW_COMPLAINT",
      title_en: "Complaint Assigned to You by CMO",
      title_ur: "سی ایم او نے شکایت آپ کے حوالے کی",
      body_en: `Complaint ${complaint.complaint_code} has been assigned to you by the CMO.`,
      body_ur: `شکایت ${complaint.complaint_code} سی ایم او نے آپ کے حوالے کی ہے۔`,
    });
    await createNotification({
      user_id: complaint.citizen_id,
      complaint_id: params.id,
      type: "ASSIGNED",
      title_en: "Officer Assigned to Your Complaint",
      title_ur: "آپ کی شکایت کا افسر مقرر ہو گیا",
      body_en: `An officer (${officer.name}) has been assigned to your complaint ${complaint.complaint_code}.`,
      body_ur: `آپ کی شکایت ${complaint.complaint_code} کا افسر (${officer.name}) مقرر ہو گیا ہے۔`,
    });
    return NextResponse.json({ complaint: await getComplaintById(params.id), officer: { id: officer.id, name: officer.name, email: officer.email } });
  }

  // Department Officer can assign employees
  if (user.role !== "DEPARTMENT_OFFICER") {
    return NextResponse.json({ error: "Only department officers or CMO can assign." }, { status: 403 });
  }
  if (complaint.department_id !== user.departmentId) {
    return NextResponse.json({ error: "This complaint does not belong to your department." }, { status: 403 });
  }

  try {
    const { employeeId, deadline, instructions } = await req.json();
    if (!employeeId || !deadline) {
      return NextResponse.json({ error: "Employee and deadline are required." }, { status: 400 });
    }

    await officerAssignEmployee(params.id, user.id, employeeId, deadline, instructions);
    return NextResponse.json({ complaint: await getComplaintById(params.id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assign complaint.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
