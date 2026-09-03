import { listAllComplaints, listDepartments } from "@/lib/db/repo";

/**
 * "Ask Pukar AI" answers ONLY from data actually present in the database.
 */
export async function askPprAi(question: string): Promise<string> {
  const q = question.toLowerCase();
  const complaints = await listAllComplaints();
  const departments = await listDepartments();

  if (complaints.length === 0) {
    return "There is no complaint data available yet to answer this question.";
  }

  if (q.includes("total") && q.includes("complaint")) {
    return `There are ${complaints.length} total complaints recorded in the system.`;
  }

  if (q.includes("biggest") && q.includes("problem")) {
    const byCategory = new Map<string, number>();
    for (const c of complaints) {
      const key = c.category ?? "Unclassified";
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
    }
    const [cat, count] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    return `The largest problem category right now is "${cat}" with ${count} complaint${count === 1 ? "" : "s"} recorded.`;
  }

  if (q.includes("pending")) {
    const pending = complaints.filter(c => c.status === "PENDING").length;
    return `There are ${pending} pending complaints waiting to be assigned.`;
  }

  if (q.includes("resolved")) {
    const resolved = complaints.filter(c => c.status === "RESOLVED").length;
    return `There are ${resolved} resolved complaints in the system.`;
  }

  if (q.includes("department")) {
    const deptSummary = departments.map(d => {
      const count = complaints.filter(c => c.department_id === d.id).length;
      return `${d.name}: ${count}`;
    }).join(", ");
    return `Complaints by department — ${deptSummary}.`;
  }

  return `I can answer questions about complaint data. Try: "total complaints", "biggest problem", "pending complaints", "resolved complaints", or "complaints by department".`;
}

export async function generateExecutiveBrief(): Promise<string> {
  const complaints = await listAllComplaints();
  if (complaints.length === 0) return "No complaint data has been recorded yet.";

  const pending = complaints.filter(c => c.status === "PENDING").length;
  const resolved = complaints.filter(c => c.status === "RESOLVED").length;
  const inProgress = complaints.filter(c => c.status === "IN_PROGRESS").length;

  return `There are ${complaints.length} total complaints: ${pending} pending, ${inProgress} in progress, ${resolved} resolved.`;
}
