"use client";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui";
import { Clock, CheckCircle2, AlertTriangle, X } from "lucide-react";
import type { SessionUser } from "@/types";

export default function EmployeeDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [drillDown, setDrillDown] = useState<{
    statusFilter: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/complaints").then((r) => r.json()).then((d) => setComplaints(d.complaints ?? []));
  }, []);

  const stats = useMemo(() => {
    const now = new Date().toISOString();
    return {
      total: complaints.length,
      assigned: complaints.filter((c: any) => c.status === "ASSIGNED").length,
      inProgress: complaints.filter((c: any) => c.status === "IN_PROGRESS").length,
      resolved: complaints.filter((c: any) => c.status === "RESOLVED").length,
      overdue: complaints.filter((c: any) => c.deadline && c.deadline < now && c.status !== "RESOLVED").length,
    };
  }, [complaints]);

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  const filteredComplaints = useMemo(() => {
    if (!drillDown) return complaints;
    if (drillDown.statusFilter === "ASSIGNED") return complaints.filter(c => c.status === "ASSIGNED");
    if (drillDown.statusFilter === "IN_PROGRESS") return complaints.filter(c => c.status === "IN_PROGRESS");
    if (drillDown.statusFilter === "RESOLVED") return complaints.filter(c => c.status === "RESOLVED");
    if (drillDown.statusFilter === "OVERDUE") {
      const now = new Date().toISOString();
      return complaints.filter(c => c.deadline && c.deadline < now && c.status !== "RESOLVED");
    }
    return complaints;
  }, [complaints, drillDown]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Employee Dashboard</h1>
      <p className="mt-1 text-xs sm:text-sm text-slate-500">{user.name} — View and manage your assigned complaints</p>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrillDown({ statusFilter: "ALL", title: "All My Complaints" })}>
          <Card className="p-4"><div className="text-2xl font-bold text-slate-900">{stats.total}</div><div className="text-xs font-medium text-slate-500">My Assigned</div></Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrillDown({ statusFilter: "ASSIGNED", title: "Pending Start" })}>
          <Card className="p-4"><div className="text-2xl font-bold text-blue-600">{stats.assigned}</div><div className="text-xs font-medium text-slate-500">Pending Start</div></Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrillDown({ statusFilter: "IN_PROGRESS", title: "In Progress" })}>
          <Card className="p-4"><div className="text-2xl font-bold text-indigo-600">{stats.inProgress}</div><div className="text-xs font-medium text-slate-500">In Progress</div></Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrillDown({ statusFilter: "RESOLVED", title: "Resolved" })}>
          <Card className="p-4"><div className="text-2xl font-bold text-emerald-600">{stats.resolved}</div><div className="text-xs font-medium text-slate-500">Resolved</div></Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrillDown({ statusFilter: "OVERDUE", title: "Overdue" })}>
          <Card className="p-4"><div className="text-2xl font-bold text-red-600">{stats.overdue}</div><div className="text-xs font-medium text-slate-500">Overdue</div></Card>
        </div>
      </div>

      <div className="mt-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-slate-600">Resolution Rate</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${resolutionRate}%` }} />
            </div>
            <span className="text-sm font-bold text-slate-700">{resolutionRate}%</span>
          </div>
        </Card>
      </div>

      {/* My Complaints */}
      <div className="mt-8">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">My Assigned Complaints</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Deadline</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {complaints.slice(0, 20).map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/employee/complaints/${c.id}`}>
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{c.complaint_code}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{c.category ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "ASSIGNED" ? "bg-blue-100 text-blue-700" :
                      c.status === "IN_PROGRESS" ? "bg-indigo-100 text-indigo-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>{c.status}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-slate-500">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</td>
                  <td className="py-2.5 text-xs text-slate-500 truncate max-w-xs">{c.description}</td>
                </tr>
              ))}
              {complaints.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">No complaints found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-Down Modal */}
      {drillDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={() => setDrillDown(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-5 py-3 rounded-t-xl">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{drillDown.title} ({filteredComplaints.length})</h2>
              <button onClick={() => setDrillDown(null)} className="rounded-lg p-1.5 hover:bg-slate-100 shrink-0 ml-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="pb-2 pr-4">Code</th>
                      <th className="pb-2 pr-4">Category</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Deadline</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.slice(0, 50).map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => { setDrillDown(null); window.location.href = `/employee/complaints/${c.id}`; }}>
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{c.complaint_code}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{c.category ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                            c.status === "ASSIGNED" ? "bg-blue-100 text-blue-700" :
                            c.status === "IN_PROGRESS" ? "bg-indigo-100 text-indigo-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>{c.status}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</td>
                        <td className="py-2.5 text-xs text-slate-500 truncate max-w-xs">{c.description}</td>
                      </tr>
                    ))}
                    {filteredComplaints.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">No complaints found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
