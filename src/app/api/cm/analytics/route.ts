import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listAllComplaints, listDepartments, listAllUsers,
  listOverdueComplaints, listIssueCategories,
} from "@/lib/db/repo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CM" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const complaints = await listAllComplaints();
  const departments = await listDepartments();
  const users = await listAllUsers();
  const categories = await listIssueCategories();
  const overdue = await listOverdueComplaints();

  // KPIs
  const totalComplaints = complaints.length;
  const pending = complaints.filter(c => c.status === "PENDING").length;
  const assigned = complaints.filter(c => c.status === "ASSIGNED").length;
  const inProgress = complaints.filter(c => c.status === "IN_PROGRESS").length;
  const markedResolved = complaints.filter(c => c.status === "MARKED_RESOLVED").length;
  const resolved = complaints.filter(c => c.status === "RESOLVED").length;
  const officerReview = complaints.filter(c => c.status === "OFFICER_REVIEW").length;
  const overdueCount = overdue.length;
  const totalEmployees = users.filter(u => u.role === "EMPLOYEE" && u.is_active).length;
  const totalOfficers = users.filter(u => u.role === "DEPARTMENT_OFFICER" && u.is_active).length;
  const totalCitizens = users.filter(u => u.role === "CITIZEN" && u.is_active).length;
  const resolutionRate = totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 0;

  // Status distribution for pie chart
  const statusDistribution = [
    { name: "Pending", value: pending, color: "#f59e0b" },
    { name: "Assigned", value: assigned, color: "#3b82f6" },
    { name: "In Progress", value: inProgress, color: "#8b5cf6" },
    { name: "Marked Resolved", value: markedResolved, color: "#06b6d4" },
    { name: "Resolved", value: resolved, color: "#10b981" },
    { name: "Officer Review", value: officerReview, color: "#ef4444" },
  ].filter(s => s.value > 0);

  // Department-wise complaint counts for bar chart
  const deptStats = departments.map(dept => {
    const deptComplaints = complaints.filter(c => c.department_id === dept.id);
    const deptResolved = deptComplaints.filter(c => c.status === "RESOLVED").length;
    const deptInProgress = deptComplaints.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)).length;
    const deptPending = deptComplaints.filter(c => c.status === "PENDING").length;
    const deptOverdue = deptComplaints.filter(c =>
      c.deadline && new Date(c.deadline) < new Date() && !["RESOLVED", "MARKED_RESOLVED"].includes(c.status)
    ).length;
    const officer = users.find(u => u.id === dept.officer_id);
    const empCount = users.filter(u => u.department_id === dept.id && u.role === "EMPLOYEE" && u.is_active).length;
    return {
      id: dept.id,
      name: dept.name,
      total: deptComplaints.length,
      resolved: deptResolved,
      inProgress: deptInProgress,
      pending: deptPending,
      overdue: deptOverdue,
      employees: empCount,
      officerName: officer?.name ?? "Unassigned",
    };
  });

  // Category breakdown
  const categoryStats = new Map<string, number>();
  for (const c of complaints) {
    const key = c.category ?? "Unclassified";
    categoryStats.set(key, (categoryStats.get(key) ?? 0) + 1);
  }
  const categoryDistribution = Array.from(categoryStats.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Daily trend (last 14 days)
  const dailyTrend: { date: string; submitted: number; resolved: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const submitted = complaints.filter(c => c.created_at.slice(0, 10) === dateStr).length;
    const resolvedOnDay = complaints.filter(c => c.resolved_at && c.resolved_at.slice(0, 10) === dateStr).length;
    dailyTrend.push({ date: dateStr, submitted, resolved: resolvedOnDay });
  }

  // Employee workload
  const employeeWorkload = users
    .filter(u => u.role === "EMPLOYEE" && u.is_active)
    .map(emp => {
      const empComplaints = complaints.filter(c => c.assigned_employee_id === emp.id);
      const active = empComplaints.filter(c => !["RESOLVED", "MARKED_RESOLVED"].includes(c.status)).length;
      const done = empComplaints.filter(c => ["RESOLVED", "MARKED_RESOLVED"].includes(c.status)).length;
      return { name: emp.name, designation: emp.designation, total: empComplaints.length, active, done };
    })
    .filter(e => e.total > 0)
    .sort((a, b) => b.active - a.active);

  // Verification stats
  const verifiedYes = complaints.filter(c => c.citizen_verification === "YES").length;
  const verifiedNo = complaints.filter(c => c.citizen_verification === "NO").length;
  const pendingVerification = complaints.filter(c => c.status === "MARKED_RESOLVED" && !c.citizen_verification).length;

  return NextResponse.json({
    kpis: {
      totalComplaints, pending, assigned, inProgress, markedResolved, resolved,
      officerReview, overdueCount, totalEmployees, totalOfficers, totalCitizens,
      resolutionRate, totalDepartments: departments.length, totalCategories: categories.length,
    },
    statusDistribution,
    deptStats,
    categoryDistribution,
    dailyTrend,
    employeeWorkload,
    verification: { verifiedYes, verifiedNo, pendingVerification },
  });
}
