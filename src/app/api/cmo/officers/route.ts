import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { listOfficersByDepartment, createUser, listDistricts } from "@/lib/db/repo";
import { newId } from "@/lib/id";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CMO") {
    return NextResponse.json({ error: "Not authorized. CMO role required." }, { status: 403 });
  }
  if (!user.departmentId) {
    return NextResponse.json({ error: "No department assigned." }, { status: 400 });
  }

  const officers = await listOfficersByDepartment(user.departmentId);
  const districts = await listDistricts();

  const officersWithDistrict = officers.map(o => ({
    id: o.id,
    name: o.name,
    email: o.email,
    designation: o.designation,
    phone: o.phone,
    district_id: o.district_id,
    district: districts.find(d => d.id === o.district_id)?.name ?? null,
    is_active: o.is_active,
  }));

  return NextResponse.json({ officers: officersWithDistrict });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CMO") {
    return NextResponse.json({ error: "Not authorized. CMO role required." }, { status: 403 });
  }
  if (!user.departmentId) {
    return NextResponse.json({ error: "No department assigned." }, { status: 400 });
  }

  const body = await req.json();
  const { name, email, phone, districtId, designation } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  // Create new DEPARTMENT_OFFICER
  const passwordHash = hashPassword("Demo@1234"); // Default password, officer should change
  const officer = await createUser({
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    role: "DEPARTMENT_OFFICER",
    phone: phone ?? null,
    department_id: user.departmentId,
    district_id: districtId ?? null,
    designation: designation ?? "Department Officer",
    language: "EN",
    is_active: 1,
    must_change_password: 1,
  });

  return NextResponse.json({ officer }, { status: 201 });
}
