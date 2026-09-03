"use client";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui";
import type { SessionUser } from "@/types";

export default function EmployeeDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);

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

  if (!user) return null;

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Employee Dashboard</h1>
      <p className="mt-1 text-xs sm:text-sm text-slate-500">{user.name} — View and manage your assigned complaints</p>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <Card className="p-4"><div className="text-2xl font-bold text-slate-900">{stats.total}</div><div className="text-xs font-medium text-slate-500">My Assigned</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-blue-600">{stats.assigned}</div><div className="text-xs font-medium text-slate-500">Pending Start</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-indigo-600">{stats.inProgress}</div><div className="text-xs font-medium text-slate-500">In Progress</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-emerald-600">{stats.resolved}</div><div className="text-xs font-medium text-slate-500">Resolved</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-red-600">{stats.overdue}</div><div className="text-xs font-medium text-slate-500">Overdue</div></Card>
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
              {complaints.slice(0, 10).map((c: any) => (
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
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">No complaints assigned to you</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
