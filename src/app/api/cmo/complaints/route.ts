import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listComplaintsByDepartment, listComplaintsByDepartmentAndDistrict, getDistrictByName, listDistricts, updateComplaint } from "@/lib/db/repo";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CMO") {
    return NextResponse.json({ error: "Not authorized. CMO role required." }, { status: 403 });
  }
  if (!user.departmentId) {
    return NextResponse.json({ error: "No department assigned." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const districtId = searchParams.get("districtId");

  let complaints;
  if (districtId) {
    complaints = await listComplaintsByDepartmentAndDistrict(user.departmentId, districtId);
  } else {
    complaints = await listComplaintsByDepartment(user.departmentId);
  }

  // Resolve districts from coordinates for complaints with null district_id
  const urduToEnglish: Record<string, string> = {
    "اسلام آباد": "Islamabad", "راولپنڈی": "Rawalpindi", "لاہور": "Lahore",
    "سیالکوٹ": "Sialkot", "گوجرانوالہ": "Gujranwala", "گجرات": "Gujrat",
    "فیصل آباد": "Faisalabad", "ملتان": "Multan", "کراچی": "Karachi",
    "پشاور": "Peshawar", "کوئٹہ": "Quetta", "بہاولپور": "Bahawalpur",
  };

  complaints = await Promise.all(complaints.map(async (c) => {
    if (c.district_id || !c.latitude || !c.longitude) return c;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.latitude}&lon=${c.longitude}&zoom=10&addressdetails=1`,
        { headers: { "User-Agent": "Pukar-Complaint-App/1.0", "Accept-Language": "en" }, signal: AbortSignal.timeout(5000) }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        let geoName = addr.city || addr.town || addr.district || addr.county || addr.state_district;
        if (geoName) {
          if (/[\u0600-\u06FF]/.test(geoName)) {
            geoName = urduToEnglish[geoName] || geoName;
          }
          const matched = await getDistrictByName(geoName);
          if (matched) {
            await updateComplaint(c.id, { district_id: matched.id });
            return { ...c, district_id: matched.id, resolvedDistrict: matched.name };
          }
          const districts = await listDistricts();
          const lower = geoName.toLowerCase();
          for (const d of districts) {
            if (d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) {
              await updateComplaint(c.id, { district_id: d.id });
              return { ...c, district_id: d.id, resolvedDistrict: d.name };
            }
          }
          // No match found — return with resolved name for display
          return { ...c, resolvedDistrict: geoName };
        }
      }
    } catch {
      // Failed — return as is
    }
    return c;
  }));

  return NextResponse.json({ complaints });
}
