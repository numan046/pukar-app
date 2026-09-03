import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getMasterProblemById,
  getComplaintsByMasterProblem,
  getUserById,
  getDepartment,
  getDistrict,
  updateMasterProblem,
  addComplaintHistory,
  createComplaintUpdate,
  createNotification,
} from "@/lib/db/repo";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const masterProblem = await getMasterProblemById(params.id);
  if (!masterProblem) return NextResponse.json({ error: "Master problem not found." }, { status: 404 });

  // Get all linked complaints
  const complaints = await getComplaintsByMasterProblem(params.id);

  // Get citizen details for each complaint
  const complaintsWithCitizens = await Promise.all(
    complaints.map(async (c) => {
      const citizen = await getUserById(c.citizen_id);
      return {
        ...c,
        citizen: citizen ? { id: citizen.id, name: citizen.name, email: citizen.email, phone: citizen.phone } : null,
      };
    })
  );

  // Get assigned employee details
  const assignedEmployee = masterProblem.assigned_employee_id
    ? await getUserById(masterProblem.assigned_employee_id)
    : null;

  // Get department and district
  const department = masterProblem.department_id ? await getDepartment(masterProblem.department_id) : null;
  const district = masterProblem.district_id ? await getDistrict(masterProblem.district_id) : null;

  return NextResponse.json({
    masterProblem,
    complaints: complaintsWithCitizens,
    assignedEmployee: assignedEmployee
      ? { id: assignedEmployee.id, name: assignedEmployee.name, email: assignedEmployee.email, designation: assignedEmployee.designation, phone: assignedEmployee.phone }
      : null,
    department,
    district,
  });
}

// Officer assigns employee to master problem
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "DEPARTMENT_OFFICER" && user.role !== "CMO") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const masterProblem = await getMasterProblemById(params.id);
  if (!masterProblem) return NextResponse.json({ error: "Master problem not found." }, { status: 404 });

  const { employeeId, deadline, instructions } = await req.json();
  if (!employeeId || !deadline) {
    return NextResponse.json({ error: "Employee and deadline are required." }, { status: 400 });
  }

  const employee = await getUserById(employeeId);
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  // Update master problem
  await updateMasterProblem(params.id, {
    status: "IN_PROGRESS",
    assigned_employee_id: employeeId,
    assigned_officer_id: user.id,
    deadline,
  });

  // Add history
  await addComplaintHistory({
    complaint_id: params.id,
    user_id: user.id,
    action: "MASTER_PROBLEM_ASSIGNED",
    new_status: "IN_PROGRESS",
    description: `Master Problem ${masterProblem.code} assigned to ${employee.name}. ${instructions ? `Instructions: ${instructions}` : ""}`,
  });

  // Notify employee
  await createNotification({
    user_id: employeeId,
    complaint_id: null,
    type: "MASTER_PROBLEM_ASSIGNED",
    title_en: "Master Problem Assigned to You",
    title_ur: "ماسٹر پرابلم آپ کو تفویض ہو گئی",
    body_en: `Master Problem ${masterProblem.code} (${masterProblem.complaint_count} citizens affected) has been assigned to you. Deadline: ${new Date(deadline).toLocaleDateString()}.`,
    body_ur: `ماسٹر پرابلم ${masterProblem.code} (${masterProblem.complaint_count} شہری متاثر) آپ کو تفویض کر دی گئی ہے۔ آخری تاریخ: ${new Date(deadline).toLocaleDateString()}۔`,
  });

  // Notify all affected citizens
  const complaints = await getComplaintsByMasterProblem(params.id);
  for (const complaint of complaints) {
    await createNotification({
      user_id: complaint.citizen_id,
      complaint_id: complaint.id,
      type: "MASTER_PROBLEM_ASSIGNED",
      title_en: "Your problem is being addressed",
      title_ur: "آپ کا مسئلہ حل کیا جا رہا ہے",
      body_en: `The problem affecting you and ${masterProblem.complaint_count - 1} other citizen(s) has been assigned to ${employee.name} for resolution.`,
      body_ur: `آپ اور ${masterProblem.complaint_count - 1} دوسرے شہریوں کو متاثر کرنے والا مسئلہ حل کے لیے ${employee.name} کے حوالے کر دیا گیا ہے۔`,
    });
  }

  return NextResponse.json({ success: true });
}
