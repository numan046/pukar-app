import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createBroadcast, listBroadcastsBySender, listAllBroadcasts,
  listBroadcastsForCmo, listBroadcastsForCitizen,
  listCmos, listDistricts, listCitizensByDistrict,
  listComplaintsByCitizen,
  createNotification,
} from "@/lib/db/repo";
import { newId } from "@/lib/id";

// GET: List broadcasts based on role
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    let broadcasts: any[] = [];

    if (user.role === "CM") {
      broadcasts = await listBroadcastsBySender(user.id);
    } else if (user.role === "CMO") {
      const forMe = await listBroadcastsForCmo(user.id);
      const myOwn = await listBroadcastsBySender(user.id);
      const map = new Map<string, any>();
      for (const b of [...forMe, ...myOwn]) map.set(b.id, b);
      broadcasts = Array.from(map.values());
    } else if (user.role === "DEPARTMENT_OFFICER") {
      const myOwn = await listBroadcastsBySender(user.id);
      const allActive = await listAllBroadcasts();
      const cmOrders = allActive.filter(b => b.sender_role === "CM" && b.department_id === user.departmentId);
      const map = new Map<string, any>();
      for (const b of [...myOwn, ...cmOrders]) map.set(b.id, b);
      broadcasts = Array.from(map.values());
    } else if (user.role === "CITIZEN") {
      const complaints = await listComplaintsByCitizen(user.id);
      const complaintDistricts = [...new Set(complaints.map(c => c.district_id).filter(Boolean))] as string[];
      broadcasts = await listBroadcastsForCitizen(user.districtId, complaintDistricts);
    } else {
      broadcasts = await listAllBroadcasts();
    }

    return NextResponse.json({ broadcasts });
  } catch (err: any) {
    console.error("GET /api/broadcasts error:", err.message);
    return NextResponse.json({ broadcasts: [], error: err.message }, { status: 500 });
  }
}

// POST: Create a new broadcast
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = await req.json();
    const { title, message, targetLevel, targetIds, validUntil } = body;

    if (!title || !message || !targetLevel) {
      return NextResponse.json({ error: "Title, message, and targetLevel are required." }, { status: 400 });
    }

    if (user.role === "CM" && targetLevel !== "CMO") {
      return NextResponse.json({ error: "CM can only send to CMOs." }, { status: 403 });
    }
    if (user.role === "CMO" && targetLevel !== "DISTRICT") {
      return NextResponse.json({ error: "CMO can only send to districts." }, { status: 403 });
    }
    if (user.role === "DEPARTMENT_OFFICER" && targetLevel !== "CITIZENS") {
      return NextResponse.json({ error: "Officer can only send to citizens." }, { status: 403 });
    }

    const broadcast = await createBroadcast({
      id: newId("bc"),
      sender_id: user.id,
      sender_role: user.role,
      title,
      message,
      target_level: targetLevel,
      target_ids: JSON.stringify(targetIds ?? []),
      department_id: user.departmentId,
      district_id: user.districtId,
      valid_from: new Date().toISOString(),
      valid_until: validUntil ?? null,
      is_active: 1,
    });

    if (targetLevel === "CMO" && targetIds?.length > 0) {
      for (const cmoId of targetIds) {
        await createNotification({
          user_id: cmoId,
          complaint_id: null,
          type: "BROADCAST",
          title_en: `CM Order: ${title}`,
          title_ur: `سی ایم حکم: ${title}`,
          body_en: message,
          body_ur: message,
          valid_until: validUntil ?? null,
        });
      }
    } else if (targetLevel === "CITIZENS" && targetIds?.length > 0) {
      for (const districtId of targetIds) {
        const citizens = await listCitizensByDistrict(districtId);
        for (const citizen of citizens) {
          await createNotification({
            user_id: citizen.id,
            complaint_id: null,
            type: "BROADCAST",
            title_en: `Government Announcement: ${title}`,
            title_ur: `حکومتی اعلان: ${title}`,
            body_en: message,
            body_ur: message,
            valid_until: validUntil ?? null,
          });
        }
      }
    }

    return NextResponse.json({ broadcast }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/broadcasts error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to create broadcast." }, { status: 500 });
  }
}
