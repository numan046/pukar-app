import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listDistricts,
  createDistrict,
  updateDistrict,
  listOfficersByDistrict,
  getDistrict,
  getDepartment,
  listComplaintsByDepartmentAndDistrict,
  getOfficerForDepartmentDistrict,
  getUserById,
  updateUser,
  getComplaintById,
  updateComplaint,
  addComplaintHistory,
} from "@/lib/db/repo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CMO") {
    return NextResponse.json({ error: "Not authorized. CMO role required." }, { status: 403 });
  }

  const districts = await listDistricts();
  
  // For each district, get officer info and complaint count
  const districtsWithInfo = await Promise.all(districts.map(async d => {
    const officer = user.departmentId ? await getOfficerForDepartmentDistrict(user.departmentId, d.id) : null;
    const complaints = user.departmentId ? await listComplaintsByDepartmentAndDistrict(user.departmentId, d.id) : [];
    const allOfficers = await listOfficersByDistrict(d.id);
    
    return {
      ...d,
      officer: officer ? { id: officer.id, name: officer.name, email: officer.email, designation: officer.designation } : null,
      allOfficers: allOfficers.map(o => ({ id: o.id, name: o.name, email: o.email, department_id: o.department_id })),
      complaintCount: complaints.length,
      pendingCount: complaints.filter(c => c.status === "PENDING").length,
      resolvedCount: complaints.filter(c => c.status === "RESOLVED").length,
    };
  }));

  return NextResponse.json({ districts: districtsWithInfo });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CMO") {
    return NextResponse.json({ error: "Not authorized. CMO role required." }, { status: 403 });
  }

  const body = await req.json();
  const { name, complaintId } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "District name is required (min 2 characters)." }, { status: 400 });
  }

  const district = await createDistrict(name.trim());

  // If a complaintId is provided, update the complaint with the new district
  if (complaintId) {
    const complaint = await getComplaintById(complaintId);
    if (complaint) {
      await updateComplaint(complaintId, { district_id: district.id });
      await addComplaintHistory({
        complaint_id: complaintId,
        user_id: user.id,
        action: "DISTRICT_ADDED",
        new_status: complaint.status,
        description: `District "${district.name}" added and assigned to this complaint`,
      });
    }
  }

  return NextResponse.json({ district }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CMO") {
    return NextResponse.json({ error: "Not authorized. CMO role required." }, { status: 403 });
  }

  const body = await req.json();
  const { districtId, officerId, action } = body;

  if (!districtId) {
    return NextResponse.json({ error: "District ID is required." }, { status: 400 });
  }

  const district = await getDistrict(districtId);
  if (!district) {
    return NextResponse.json({ error: "District not found." }, { status: 404 });
  }

  if (action === "assign_officer") {
    if (!officerId) {
      return NextResponse.json({ error: "Officer ID is required." }, { status: 400 });
    }
    const officer = await getUserById(officerId);
    if (!officer || officer.role !== "DEPARTMENT_OFFICER") {
      return NextResponse.json({ error: "Officer not found." }, { status: 404 });
    }
    // Update officer's district assignment
    await updateUser(officerId, { district_id: districtId, department_id: user.departmentId });
    return NextResponse.json({ success: true, message: `Officer ${officer.name} assigned to ${district.name}` });
  }

  if (action === "remove_officer") {
    if (!officerId) {
      return NextResponse.json({ error: "Officer ID is required." }, { status: 400 });
    }
    await updateUser(officerId, { district_id: null });
    return NextResponse.json({ success: true, message: "Officer removed from district" });
  }

  if (action === "deactivate") {
    await updateDistrict(districtId, { is_active: 0 });
    return NextResponse.json({ success: true, message: "District deactivated" });
  }

  if (action === "activate") {
    await updateDistrict(districtId, { is_active: 1 });
    return NextResponse.json({ success: true, message: "District activated" });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
