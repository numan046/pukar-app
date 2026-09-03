"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import type { SessionUser } from "@/types";

export default function OfficerComplaintsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setUser(d.user);
      if (d.user?.districtId) {
        fetch("/api/districts").then((r) => r.json()).then((dd) => {
          const district = dd.districts?.find((x: any) => x.id === d.user.districtId);
          if (district) setDistrictName(district.name);
        }).catch(() => {});
      }
    });
    fetch("/api/complaints").then(r => r.json()).then(d => {
      setComplaints(d.complaints ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = complaints.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (filter) {
      const f = filter.toLowerCase();
      return c.complaint_code?.toLowerCase().includes(f) || c.title?.toLowerCase().includes(f) || c.description?.toLowerCase().includes(f) || c.area?.toLowerCase().includes(f);
    }
    return true;
  });

  const now = new Date().toISOString();

  return (
    <div className="max-w-full overflow-hidden">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Department Complaints{districtName ? ` — ${districtName}` : ""}</h1>
      <p className="mt-1 text-sm text-slate-500">View and manage complaints{districtName ? ` in ${districtName} district` : " in your department"}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input placeholder="Search by code, title, area…" value={filter} onChange={e => setFilter(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="MARKED_RESOLVED">Awaiting Verification</option>
          <option value="RESOLVED">Resolved</option>
          <option value="OFFICER_REVIEW">Needs Review</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
              <th className="pb-2 pr-4">Code</th>
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Employee</th>
              <th className="pb-2 pr-4">Deadline</th>
              <th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => {
              const isOverdue = c.deadline && c.deadline < now && !["RESOLVED"].includes(c.status);
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/officer/complaints/${c.id}`}>
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{c.complaint_code}</td>
                  <td className="py-2.5 pr-4 text-slate-800 font-medium truncate max-w-[120px] sm:max-w-[200px]">{c.title || c.description?.slice(0, 40)}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{c.category ?? "—"}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={c.status} /></td>
                  <td className="py-2.5 pr-4 text-slate-500 text-xs">{c.assigned_employee_name ?? "Unassigned"}</td>
                  <td className={`py-2.5 pr-4 text-xs ${isOverdue ? "font-bold text-red-600" : "text-slate-500"}`}>
                    {c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}
                    {isOverdue && " ⚠"}
                  </td>
                  <td className="py-2.5 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {loading && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading complaints…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">No complaints found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
