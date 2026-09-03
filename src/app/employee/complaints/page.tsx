"use client";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/badges";

export default function EmployeeComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/complaints").then(r => r.json()).then(d => {
      setComplaints(d.complaints ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = complaints.filter(c => !statusFilter || c.status === statusFilter);
  const now = new Date().toISOString();

  return (
    <div className="max-w-full overflow-hidden">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">My Assigned Complaints</h1>
      <p className="mt-1 text-sm text-slate-500">View and work on complaints assigned to you</p>

      <div className="mt-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
          <option value="">All Statuses</option>
          <option value="ASSIGNED">Pending Start</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="MARKED_RESOLVED">Marked Resolved</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
              <th className="pb-2 pr-4">Code</th>
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Deadline</th>
              <th className="pb-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => {
              const isOverdue = c.deadline && c.deadline < now && !["RESOLVED"].includes(c.status);
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/employee/complaints/${c.id}`}>
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{c.complaint_code}</td>
                  <td className="py-2.5 pr-4 text-slate-800 font-medium truncate max-w-[100px] sm:max-w-[200px]">{c.title || c.description?.slice(0, 40)}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={c.status} /></td>
                  <td className={`py-2.5 pr-4 text-xs ${isOverdue ? "font-bold text-red-600" : "text-slate-500"}`}>
                    {c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}
                    {isOverdue && " ⚠"}
                  </td>
                  <td className="py-2.5 text-xs text-slate-500 truncate max-w-xs">{c.description}</td>
                </tr>
              );
            })}
            {loading && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading complaints…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">No complaints assigned to you</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
