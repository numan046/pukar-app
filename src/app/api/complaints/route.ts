import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listComplaintsByCitizen,
  listComplaintsByDepartment,
  listComplaintsByDepartmentAndDistrict,
  listComplaintsByEmployee,
  listAllComplaints,
} from "@/lib/db/repo";
import { submitComplaint, checkOverdue } from "@/lib/workflow";
import type { ComplaintRow } from "@/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let complaints: ComplaintRow[] = [];
  if (user.role === "CITIZEN") {
    complaints = await listComplaintsByCitizen(user.id);
  } else if (user.role === "DEPARTMENT_OFFICER") {
    // Officer sees complaints in their department + district
    if (user.departmentId && user.districtId) {
      complaints = await listComplaintsByDepartmentAndDistrict(user.departmentId, user.districtId);
    } else if (user.departmentId) {
      complaints = await listComplaintsByDepartment(user.departmentId);
    }
  } else if (user.role === "CMO") {
    // CMO sees all complaints for their department (issue type) across all districts
    complaints = user.departmentId ? await listComplaintsByDepartment(user.departmentId) : [];
  } else if (user.role === "EMPLOYEE") {
    complaints = await listComplaintsByEmployee(user.id);
  } else {
    // SUPER_ADMIN and CM see everything
    complaints = await listAllComplaints();
  }

  // Check overdue status on read
  complaints = complaints.map((c) => checkOverdue(c));

  return NextResponse.json({ complaints });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CITIZEN") {
    return NextResponse.json({ error: "Only citizens can submit complaints." }, { status: 403 });
  }

  try {
    console.log("[Complaints POST] Starting submission for user:", user.id);
    const body = await req.json();
    console.log("[Complaints POST] Body keys:", Object.keys(body).join(", "));
    const { title, description, language, hasImage, hasVideo, mediaUrls, latitude, longitude, address, area, tehsil, confirmedDepartmentId, categoryId, subCategory } = body;

    if (!description || String(description).trim().length < 5) {
      return NextResponse.json({ error: "Please describe the problem in more detail." }, { status: 400 });
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Location is required to submit a complaint." }, { status: 400 });
    }

    console.log("[Complaints POST] Calling submitComplaint, deptId:", confirmedDepartmentId);
    const result = await submitComplaint({
      citizenId: user.id,
      title: title ?? null,
      description,
      language: language ?? "EN",
      hasImage: !!hasImage,
      hasVideo: !!hasVideo,
      mediaUrls: mediaUrls ?? [],
      latitude,
      longitude,
      address,
      area,
      tehsil,
      confirmedDepartmentId,
      categoryId,
      subCategory,
    });
    console.log("[Complaints POST] Success:", result.complaint.complaint_code);

    return NextResponse.json({
      complaint: result.complaint,
      aiSuggestion: result.aiSuggestion,
    });
  } catch (err) {
    console.error("[Complaints POST] ERROR:", err instanceof Error ? err.message : "");
    if (err instanceof Error && err.message.includes("could not understand")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes("timed out")) {
      return NextResponse.json({ error: "Database connection timed out. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Failed to submit complaint. Please try again." }, { status: 500 });
  }
}
