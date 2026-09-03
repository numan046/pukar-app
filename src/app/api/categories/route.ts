import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listIssueCategories, createIssueCategory, listAllIssueCategories } from "@/lib/db/repo";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const departmentId = req.nextUrl.searchParams.get("departmentId");

  if (user.role === "SUPER_ADMIN") {
    const categories = departmentId ? await listIssueCategories(departmentId) : await listAllIssueCategories();
    return NextResponse.json({ categories });
  }

  // Other roles see categories for their department or specified department
  const deptId = departmentId ?? user.departmentId;
  if (deptId) {
    const categories = await listIssueCategories(deptId);
    return NextResponse.json({ categories });
  }

  return NextResponse.json({ categories: [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admin can manage categories." }, { status: 403 });
  }

  const { departmentId, name, description } = await req.json();
  if (!departmentId || !name) {
    return NextResponse.json({ error: "Department ID and name are required." }, { status: 400 });
  }

  const category = await createIssueCategory(departmentId, name, description);
  return NextResponse.json({ category });
}
