import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAllComplaints, listDistricts } from "@/lib/db/repo";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CM") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const complaints = await listAllComplaints();
    const districts = await listDistricts();
    const districtMap = new Map(districts.map(d => [d.id, d.name]));

    // Status color mapping
    const statusColor: Record<string, string> = {
      PENDING: "yellow",
      ASSIGNED: "orange",
      IN_PROGRESS: "blue",
      MARKED_RESOLVED: "cyan",
      RESOLVED: "green",
      OFFICER_REVIEW: "red",
    };

    const markers = complaints
      .filter(c => c.latitude && c.longitude)
      .map(c => ({
        id: c.id,
        lat: c.latitude,
        lng: c.longitude,
        status: c.status,
        category: c.category ?? "Uncategorized",
        area: c.area ?? c.tehsil ?? "Unknown",
        district: districtMap.get(c.district_id ?? "") ?? "Unknown",
        code: c.complaint_code,
        color: statusColor[c.status] ?? "yellow",
      }));

    return NextResponse.json({ markers });
  } catch (err: any) {
    console.error("GET /api/cm/complaint-map error:", err.message);
    return NextResponse.json({ markers: [], error: err.message }, { status: 500 });
  }
}
