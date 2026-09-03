import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listMasterProblemsByDepartment,
  listMasterProblemsByDepartmentAndDistrict,
  listAllMasterProblems,
  listMasterProblemsByEmployee,
} from "@/lib/db/repo";
import type { MasterProblemRow } from "@/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let masterProblems: MasterProblemRow[];

  if (user.role === "DEPARTMENT_OFFICER") {
    // Officer sees master problems in their department + district
    if (user.departmentId && user.districtId) {
      masterProblems = await listMasterProblemsByDepartmentAndDistrict(user.departmentId, user.districtId);
    } else if (user.departmentId) {
      masterProblems = await listMasterProblemsByDepartment(user.departmentId);
    } else {
      masterProblems = [];
    }
  } else if (user.role === "CMO") {
    // CMO sees all master problems for their department
    if (user.departmentId) {
      masterProblems = await listMasterProblemsByDepartment(user.departmentId);
    } else {
      masterProblems = [];
    }
  } else if (user.role === "EMPLOYEE") {
    // Employee sees master problems assigned to them
    masterProblems = await listMasterProblemsByEmployee(user.id);
  } else {
    // SUPER_ADMIN and CM see everything
    masterProblems = await listAllMasterProblems();
  }

  return NextResponse.json({ masterProblems });
}
