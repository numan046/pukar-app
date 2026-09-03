"use client";
import { useEffect, useState } from "react";
import { Users, FolderKanban } from "lucide-react";
import type { MasterProblemRow } from "@/types";

export default function MasterProblemsPage() {
  const [masterProblems, setMasterProblems] = useState<MasterProblemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/master-problems")
      .then((r) => r.json())
      .then((d) => setMasterProblems(d.masterProblems ?? []))
      .finally(() => setLoading(false));
  }, []);

  const priorityColor = (p: string) => {
    switch (p) {
      case "P0": return "bg-red-100 text-red-700 border-red-200";
      case "P1": return "bg-orange-100 text-orange-700 border-orange-200";
      case "P2": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-green-100 text-green-700 border-green-200";
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Loading master problems…</div>;

  return (
    <div>
      <div className="flex items-center gap-2">
        <FolderKanban size={20} className="text-indigo-600 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Master Problems</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Multiple citizens reporting the same issue are automatically grouped into one problem
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
              <th className="pb-2 pr-4">Code</th>
              <th className="pb-2 pr-4">Problem</th>
              <th className="pb-2 pr-4">Priority</th>
              <th className="pb-2 pr-4">Citizens</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Deadline</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {masterProblems.map((mp) => (
              <tr key={mp.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{mp.code}</td>
                <td className="py-2.5 pr-4">
                  <div className="font-medium text-slate-800">{mp.title}</div>
                  <div className="text-xs text-slate-500">{mp.category} — {mp.area || "Area not specified"}</div>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${priorityColor(mp.priority)}`}>
                    {mp.priority}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600">
                    <Users size={14} /> {mp.complaint_count}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    mp.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                    mp.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{mp.status}</span>
                </td>
                <td className="py-2.5 pr-4 text-xs text-slate-500">
                  {mp.deadline ? new Date(mp.deadline).toLocaleDateString() : "—"}
                </td>
                <td className="py-2.5">
                  <a href={`/officer/master-problems/${mp.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                    View →
                  </a>
                </td>
              </tr>
            ))}
            {masterProblems.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">No master problems yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
