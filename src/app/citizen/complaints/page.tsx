"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/badges";

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/complaints")
      .then(r => r.json())
      .then(d => setComplaints(d.complaints ?? []))
      .catch(() => setComplaints([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = complaints.filter(c => !statusFilter || c.status === statusFilter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">My Complaints</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="MARKED_RESOLVED">Awaiting Verification</option>
          <option value="RESOLVED">Resolved</option>
          <option value="OFFICER_REVIEW">Under Review</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="mt-3 text-slate-400">Loading complaints...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-slate-400">No complaints yet.</p>
          <Link href="/citizen/report" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">Submit your first complaint →</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <Link key={c.id} href={`/citizen/complaints/${c.id}`}>
              <Card className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 transition hover:border-brand-300">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs font-mono text-slate-400">{c.complaint_code}</span>
                    {c.category && <span className="text-[10px] sm:text-xs text-slate-500 truncate">· {c.category}</span>}
                  </div>
                  <div className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-slate-800">{c.title || c.description?.slice(0, 60)}</div>
                  <div className="mt-0.5 truncate text-[10px] sm:text-xs text-slate-500">{c.area || c.address || ""}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={c.status} />
                  {c.status === "MARKED_RESOLVED" && <span className="text-[10px] font-bold text-orange-600">Verify now →</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
