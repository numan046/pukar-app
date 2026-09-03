import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getComplaintById, getComplaintUpdates, getComplaintHistory, getUserById, getDepartment, getDistrict, getDistrictByName, listDistricts, updateComplaint } from "@/lib/db/repo";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const complaint = await getComplaintById(params.id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });

  // Authorization check
  if (user.role === "CITIZEN" && complaint.citizen_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }
  if (user.role === "EMPLOYEE" && complaint.assigned_employee_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }
  if (user.role === "DEPARTMENT_OFFICER") {
    // Officer can only see complaints in their department + district
    if (complaint.department_id !== user.departmentId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }
    if (user.districtId && complaint.district_id !== user.districtId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }
  }
  if (user.role === "CMO" && complaint.department_id !== user.departmentId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Enrich with related data
  const citizen = await getUserById(complaint.citizen_id);
  const assignedEmployee = complaint.assigned_employee_id ? await getUserById(complaint.assigned_employee_id) : null;
  const assignedOfficer = complaint.assigned_officer_id ? await getUserById(complaint.assigned_officer_id) : null;
  const department = complaint.department_id ? await getDepartment(complaint.department_id) : null;
  let district = complaint.district_id ? await getDistrict(complaint.district_id) : null;

  // If district is null but coordinates exist, try to resolve from coordinates
  if (!district && complaint.latitude && complaint.longitude) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${complaint.latitude}&lon=${complaint.longitude}&zoom=10&addressdetails=1`,
        { headers: { "User-Agent": "Pukar-Complaint-App/1.0", "Accept-Language": "en" }, signal: AbortSignal.timeout(8000) }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        let geoName = addr.city || addr.town || addr.district || addr.county || addr.state_district;
        if (geoName) {
          // Translate Urdu names to English
          const urduToEnglish: Record<string, string> = {
            "اسلام آباد": "Islamabad", "راولپنڈی": "Rawalpindi", "لاہور": "Lahore",
            "سیالکوٹ": "Sialkot", "گوجرانوالہ": "Gujranwala", "گجرات": "Gujrat",
            "فیصل آباد": "Faisalabad", "ملتان": "Multan", "کراچی": "Karachi",
            "پشاور": "Peshawar", "کوئٹہ": "Quetta", "بہاولپور": "Bahawalpur",
          };
          if (/[\u0600-\u06FF]/.test(geoName)) {
            geoName = urduToEnglish[geoName] || geoName;
          }
          // Try exact match
          const matched = await getDistrictByName(geoName);
          if (matched) {
            district = matched;
            // Auto-fix: update complaint with resolved district
            await updateComplaint(complaint.id, { district_id: matched.id });
          } else {
            // Try fuzzy match
            const districts = await listDistricts();
            const lower = geoName.toLowerCase();
            for (const d of districts) {
              if (d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) {
                district = d;
                await updateComplaint(complaint.id, { district_id: d.id });
                break;
              }
            }
          }
        }
      }
    } catch {
      // Reverse geocoding failed — district stays null
    }
  }

  const updates = await getComplaintUpdates(complaint.id);
  const history = await getComplaintHistory(complaint.id);

  return NextResponse.json({
    complaint,
    citizen: citizen ? { id: citizen.id, name: citizen.name, email: citizen.email, phone: citizen.phone } : null,
    assignedEmployee: assignedEmployee ? { id: assignedEmployee.id, name: assignedEmployee.name, email: assignedEmployee.email, phone: assignedEmployee.phone, designation: assignedEmployee.designation } : null,
    assignedOfficer: assignedOfficer ? { id: assignedOfficer.id, name: assignedOfficer.name, email: assignedOfficer.email } : null,
    department: department ? { id: department.id, name: department.name } : null,
    district: district ? { id: district.id, name: district.name } : null,
    updates,
    history,
  });
}
