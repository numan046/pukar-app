import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listAllComplaints, listDepartments, listAllUsers, listIssueCategories,
  listOverdueComplaints,
} from "@/lib/db/repo";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function buildDataSnapshot() {
  const complaints = await listAllComplaints();
  const departments = await listDepartments();
  const users = await listAllUsers();
  const categories = await listIssueCategories();
  const overdue = await listOverdueComplaints();

  const byStatus = new Map<string, number>();
  const byDept = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byEmployee = new Map<string, { name: string; count: number }>();

  for (const c of complaints) {
    byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
    const dept = departments.find(d => d.id === c.department_id);
    if (dept) byDept.set(dept.name, (byDept.get(dept.name) ?? 0) + 1);
    if (c.category) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
    if (c.assigned_employee_id) {
      const emp = users.find(u => u.id === c.assigned_employee_id);
      if (emp) {
        const existing = byEmployee.get(emp.id) ?? { name: emp.name, count: 0 };
        existing.count++;
        byEmployee.set(emp.id, existing);
      }
    }
  }

  const resolved = complaints.filter(c => c.status === "RESOLVED").length;
  const verifiedYes = complaints.filter(c => c.citizen_verification === "YES").length;
  const verifiedNo = complaints.filter(c => c.citizen_verification === "NO").length;

  return {
    totalComplaints: complaints.length,
    statusBreakdown: Object.fromEntries(byStatus),
    departmentBreakdown: Object.fromEntries(byDept),
    categoryBreakdown: Object.fromEntries(byCategory),
    employeeWorkload: Array.from(byEmployee.values()).sort((a, b) => b.count - a.count),
    totalDepartments: departments.length,
    departmentNames: departments.map(d => d.name),
    totalEmployees: users.filter(u => u.role === "EMPLOYEE" && u.is_active).length,
    totalOfficers: users.filter(u => u.role === "DEPARTMENT_OFFICER" && u.is_active).length,
    totalCitizens: users.filter(u => u.role === "CITIZEN" && u.is_active).length,
    resolvedCount: resolved,
    resolutionRate: complaints.length > 0 ? Math.round((resolved / complaints.length) * 100) : 0,
    overdueCount: overdue.length,
    citizenVerification: { confirmed: verifiedYes, disputed: verifiedNo },
    categories: categories.map(c => c.name),
    recentComplaints: complaints.slice(0, 5).map(c => ({
      code: c.complaint_code,
      title: c.title ?? c.category ?? "N/A",
      status: c.status,
      department: departments.find(d => d.id === c.department_id)?.name ?? "N/A",
      created: c.created_at,
    })),
  };
}

// Helper: check if question contains any of the given keywords
function has(q: string, ...keywords: string[]): boolean {
  return keywords.some(kw => q.includes(kw));
}

function generateAnswer(question: string, data: Awaited<ReturnType<typeof buildDataSnapshot>>): string {
  const q = question.toLowerCase().trim();

  // Greeting
  if (q.match(/^(hi|hello|hey|salam|assalam|aoa)/)) {
    return "Hello! I'm the Pukar AI analytics assistant. I can answer questions about complaint data across all departments. Try asking:\n\n- Total complaints or status breakdown\n- Department-wise performance\n- Employee workload\n- Resolution rates\n- Overdue complaints\n- Citizen verification stats\n- Category analysis\n- Recent complaints";
  }

  // ---- TOTAL COMPLAINTS ----
  if (has(q, "total", "how many") && has(q, "complaint") && !has(q, "department", "dept", "employee", "officer", "category", "user", "people", "citizen")) {
    return `There are **${data.totalComplaints}** total complaints in the system across ${data.totalDepartments} departments.`;
  }

  // ---- STATUS BREAKDOWN ----
  if (has(q, "status", "breakdown") ||
      has(q, "pending") ||
      has(q, "in_progress", "in progress", "in-progress") ||
      has(q, "assigned") && has(q, "how many") ||
      has(q, "officer_review", "officer review")) {
    const lines = Object.entries(data.statusBreakdown).map(([s, c]) => `- **${s.replace(/_/g, " ")}**: ${c}`);
    return `**Complaint Status Breakdown** (Total: ${data.totalComplaints}):\n\n${lines.join("\n")}`;
  }

  // ---- DEPARTMENT PERFORMANCE ----
  const deptKeywords = ["department", "dept", "gas", "electricity", "road", "water", "sewage", "health", "education", "revenue", "agriculture", "local", "housing", "transport", "finance", "excise"];
  if (has(q, ...deptKeywords)) {
    // Check if asking "which is best/worst/highest/lowest"
    if (has(q, "most", "highest", "max", "best", "top", "worst", "least", "lowest", "min", "bad", "more")) {
      const sorted = Object.entries(data.departmentBreakdown).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) return "No complaints have been filed yet.";
      const isLowest = has(q, "worst", "least", "lowest", "min", "bad");
      const pick = isLowest ? sorted[sorted.length - 1] : sorted[0];
      const label = isLowest ? "least" : "most";
      return `**${pick[0]}** has the ${label} complaints with **${pick[1]}** complaints.\n\nFull breakdown:\n${sorted.map(([d, c]) => `- ${d}: ${c}`).join("\n")}`;
    }
    const lines = Object.entries(data.departmentBreakdown).map(([d, c]) => `- **${d}**: ${c} complaints`);
    return `**Department-wise Complaint Distribution**:\n\n${lines.join("\n")}`;
  }

  // ---- EMPLOYEE WORKLOAD ----
  if ((has(q, "employee", "workload", "worker", "staff", "assign") || has(q, "who") && has(q, "handle", "work", "assigned")) && !has(q, "how many", "total", "count")) {
    if (data.employeeWorkload.length === 0) return "No employees have been assigned complaints yet.";
    const lines = data.employeeWorkload.map(e => `- **${e.name}**: ${e.count} complaint(s)`);
    return `**Employee Workload**:\n\n${lines.join("\n")}`;
  }

  // ---- RESOLUTION RATE ----
  if (has(q, "resolution", "resolved", "solve", "solved", "complete", "completed", "close", "closed", "fixed", "fix")) {
    return `**Resolution Statistics**:\n\n- Resolved: **${data.resolvedCount}** out of ${data.totalComplaints}\n- Resolution Rate: **${data.resolutionRate}%**\n- Overdue: **${data.overdueCount}** complaints past deadline`;
  }

  // ---- OVERDUE ----
  if (has(q, "overdue", "late", "deadline", "delay", "delayed", "slow")) {
    return `There are **${data.overdueCount}** overdue complaints (past their deadline and not yet resolved).${data.overdueCount > 0 ? "\n\nThese need immediate attention." : "\n\nAll complaints are within their deadlines."}`;
  }

  // ---- VERIFICATION / CITIZEN FEEDBACK ----
  if ((has(q, "verif", "confirm", "dispute", "feedback", "satisfaction", "satisfied") || (has(q, "citizen") && has(q, "confirm", "dispute", "feedback", "verify", "rating"))) && !has(q, "how many", "total", "register")) {
    const total = data.citizenVerification.confirmed + data.citizenVerification.disputed;
    const rate = total > 0 ? Math.round((data.citizenVerification.confirmed / total) * 100) : 0;
    return `**Citizen Verification Stats**:\n\n- Confirmed solved: **${data.citizenVerification.confirmed}**\n- Disputed (not solved): **${data.citizenVerification.disputed}**\n- Satisfaction rate: **${rate}%**\n\nThis shows how citizens rated the resolution quality.`;
  }

  // ---- CATEGORY ----
  if (has(q, "category", "categories", "type", "types", "biggest", "common", "issue", "issues", "problem", "problems", "topic")) {
    if (Object.keys(data.categoryBreakdown).length === 0) return "No complaints have been categorized yet.";
    const lines = Object.entries(data.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- **${c}**: ${n}`);
    return `**Complaint Categories** (sorted by frequency):\n\n${lines.join("\n")}`;
  }

  // ---- RECENT COMPLAINTS ----
  if (has(q, "recent", "latest", "new", "last", "newest", "fresh")) {
    if (data.recentComplaints.length === 0) return "No complaints have been filed yet.";
    const lines = data.recentComplaints.map(c => `- **${c.code}**: ${c.title} — [${c.status}] in ${c.department}`);
    return `**Most Recent Complaints**:\n\n${lines.join("\n")}`;
  }

  // ---- USERS / PEOPLE COUNT ----
  if (has(q, "user", "people", "register", "registered", "account", "member") ||
      (has(q, "how many") && has(q, "officer", "employee", "citizen"))) {
    return `**System Users**:\n\n- Officers: **${data.totalOfficers}**\n- Employees: **${data.totalEmployees}**\n- Citizens: **${data.totalCitizens}**\n- Departments: **${data.totalDepartments}**`;
  }

  // ---- PERFORMANCE / OVERVIEW ----
  if (has(q, "performance", "overview", "summary", "report", "overall", "system", "everything", "all") ||
      (has(q, "how") && has(q, "going", "running", "work", "doing"))) {
    const active = data.totalComplaints - data.resolvedCount;
    return `**System Performance Overview**:\n\n- Total complaints: **${data.totalComplaints}**\n- Active (not resolved): **${active}**\n- Resolved: **${data.resolvedCount}** (${data.resolutionRate}%)\n- Overdue: **${data.overdueCount}**\n- Departments: **${data.totalDepartments}**\n- Officers: **${data.totalOfficers}**, Employees: **${data.totalEmployees}**\n- Citizen satisfaction: ${data.citizenVerification.confirmed} confirmed, ${data.citizenVerification.disputed} disputed\n\n${data.overdueCount > 0 ? "There are overdue complaints that need attention." : "No overdue complaints — system is on track."}`;
  }

  // ---- COMPARATIVE: which employee has most ----
  if (has(q, "which") && has(q, "employee", "person", "worker") && has(q, "most", "highest", "max", "more", "busy")) {
    if (data.employeeWorkload.length === 0) return "No employees have been assigned complaints yet.";
    const top = data.employeeWorkload[0];
    return `**${top.name}** has the highest workload with **${top.count}** complaints assigned.\n\nFull workload:\n${data.employeeWorkload.map(e => `- ${e.name}: ${e.count}`).join("\n")}`;
  }

  // ---- DEFAULT: unable to answer ----
  return "I'm sorry, I'm unable to answer that question. I can only help with complaint data analysis. Try asking:\n\n- \"Total complaints\"\n- \"Status breakdown\"\n- \"Department-wise performance\"\n- \"Which department has most complaints?\"\n- \"Employee workload\"\n- \"Resolution rate\"\n- \"Overdue complaints\"\n- \"Citizen verification stats\"\n- \"Category analysis\"\n- \"Recent complaints\"\n- \"How is the system performing?\"";
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "CM" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { messages } = await req.json() as { messages: ChatMessage[] };
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required." }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage?.content?.trim()) {
    return NextResponse.json({ error: "Please ask a question." }, { status: 400 });
  }

  const data = await buildDataSnapshot();
  const answer = generateAnswer(lastMessage.content, data);

  return NextResponse.json({ answer });
}
