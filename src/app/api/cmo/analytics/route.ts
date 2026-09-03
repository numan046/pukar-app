import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listComplaintsByDepartment,
  listDistricts,
  listOfficersByDepartment,
  listEmployeesByDepartment,
  listComplaintsByDepartmentAndDistrict,
  getDepartment,
} from "@/lib/db/repo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CMO" && user.role !== "SUPER_ADMIN" && user.role !== "CM") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (!user.departmentId) {
    return NextResponse.json({ error: "No department assigned." }, { status: 400 });
  }

  const complaints = await listComplaintsByDepartment(user.departmentId);
  const districts = await listDistricts();
  const officers = await listOfficersByDepartment(user.departmentId);
  const employees = await listEmployeesByDepartment(user.departmentId);
  const department = await getDepartment(user.departmentId);

  // District-wise stats
  const districtStats = await Promise.all(districts.map(async d => {
    const distComplaints = await listComplaintsByDepartmentAndDistrict(user.departmentId!, d.id);
    const distOfficers = officers.filter(o => o.district_id === d.id);
    const distEmployees = employees.filter(e => e.district_id === d.id);
    
    return {
      district: d,
      totalComplaints: distComplaints.length,
      pending: distComplaints.filter(c => c.status === "PENDING").length,
      assigned: distComplaints.filter(c => c.status === "ASSIGNED").length,
      inProgress: distComplaints.filter(c => c.status === "IN_PROGRESS").length,
      resolved: distComplaints.filter(c => c.status === "RESOLVED").length,
      officerCount: distOfficers.length,
      employeeCount: distEmployees.length,
      hasOfficer: distOfficers.length > 0,
    };
  }));

  // Status breakdown
  const statusBreakdown = {
    PENDING: complaints.filter(c => c.status === "PENDING").length,
    ASSIGNED: complaints.filter(c => c.status === "ASSIGNED").length,
    IN_PROGRESS: complaints.filter(c => c.status === "IN_PROGRESS").length,
    MARKED_RESOLVED: complaints.filter(c => c.status === "MARKED_RESOLVED").length,
    RESOLVED: complaints.filter(c => c.status === "RESOLVED").length,
    OFFICER_REVIEW: complaints.filter(c => c.status === "OFFICER_REVIEW").length,
  };

  // Officer performance
  const officerPerformance = officers.map(o => {
    const officerComplaints = complaints.filter(c => c.assigned_officer_id === o.id);
    const resolved = officerComplaints.filter(c => c.status === "RESOLVED").length;
    return {
      officer: { id: o.id, name: o.name, designation: o.designation },
      district: districts.find(d => d.id === o.district_id)?.name ?? "Unassigned",
      totalAssigned: officerComplaints.length,
      resolved,
      pending: officerComplaints.filter(c => c.status === "PENDING").length,
      resolutionRate: officerComplaints.length > 0 ? Math.round((resolved / officerComplaints.length) * 100) : 0,
    };
  });

  // KPIs
  const totalResolved = complaints.filter(c => c.status === "RESOLVED").length;
  const now = new Date().toISOString();
  const overdue = complaints.filter(c => c.deadline && c.deadline < now && c.status !== "RESOLVED").length;

  return NextResponse.json({
    department: department ? { id: department.id, name: department.name } : null,
    kpis: {
      totalComplaints: complaints.length,
      totalResolved,
      resolutionRate: complaints.length > 0 ? Math.round((totalResolved / complaints.length) * 100) : 0,
      totalOfficers: officers.length,
      totalEmployees: employees.length,
      totalDistricts: districts.length,
      districtsCovered: districts.filter(d => officers.some(o => o.district_id === d.id)).length,
      overdue,
    },
    statusBreakdown,
    districtStats,
    officerPerformance,
  });
}
