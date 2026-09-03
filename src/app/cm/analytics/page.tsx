"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Building2, Users, AlertTriangle, Clock } from "lucide-react";

interface DeptStat {
  id: string; name: string; total: number; resolved: number; inProgress: number;
  pending: number; overdue: number; employees: number; officerName: string;
}
interface EmpWork { name: string; designation: string | null; total: number; active: number; done: number; }

export default function CmAnalytics() {
  const [depts, setDepts] = useState<DeptStat[]>([]);
  const [employees, setEmployees] = useState<EmpWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cm/analytics").then(r => r.json()).then(d => {
      setDepts(d.deptStats ?? []);
      setEmployees(d.employeeWorkload ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading analytics…</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Detailed Analytics</h1>
        <p className="text-sm text-slate-500">Department and employee performance breakdown</p>
      </div>

      {/* Department Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {depts.map(d => {
          const resRate = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
          return (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-indigo-500" />
                    <div className="text-sm font-bold text-slate-800">{d.name}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Officer: {d.officerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">{d.total}</div>
                  <div className="text-[10px] text-slate-500">complaints</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                  <span>Resolution Progress</span>
                  <span className="font-semibold text-emerald-600">{resRate}%</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  {d.resolved > 0 && <div className="bg-emerald-500" style={{ width: `${(d.resolved / d.total) * 100}%` }} />}
                  {d.inProgress > 0 && <div className="bg-violet-400" style={{ width: `${(d.inProgress / d.total) * 100}%` }} />}
                  {d.pending > 0 && <div className="bg-amber-400" style={{ width: `${(d.pending / d.total) * 100}%` }} />}
                </div>
              </div>

              {/* Stats grid */}
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div className="rounded bg-emerald-50 py-1.5">
                  <div className="text-sm font-bold text-emerald-700">{d.resolved}</div>
                  <div className="text-[9px] text-emerald-600">Resolved</div>
                </div>
                <div className="rounded bg-violet-50 py-1.5">
                  <div className="text-sm font-bold text-violet-700">{d.inProgress}</div>
                  <div className="text-[9px] text-violet-600">Active</div>
                </div>
                <div className="rounded bg-amber-50 py-1.5">
                  <div className="text-sm font-bold text-amber-700">{d.pending}</div>
                  <div className="text-[9px] text-amber-600">Pending</div>
                </div>
                <div className={`rounded py-1.5 ${d.overdue > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                  <div className={`text-sm font-bold ${d.overdue > 0 ? "text-red-700" : "text-slate-400"}`}>{d.overdue}</div>
                  <div className={`text-[9px] ${d.overdue > 0 ? "text-red-600" : "text-slate-400"}`}>Overdue</div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                <Users size={10} /> {d.employees} employee{d.employees !== 1 ? "s" : ""}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Employee Performance */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users size={16} className="text-slate-500" />
          <div className="text-sm font-semibold text-slate-700">Employee Performance</div>
        </div>
        {employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="pb-2 pr-4">Employee</th>
                  <th className="pb-2 pr-4">Designation</th>
                  <th className="pb-2 pr-4 text-center">Total</th>
                  <th className="pb-2 pr-4 text-center">Active</th>
                  <th className="pb-2 pr-4 text-center">Done</th>
                  <th className="pb-2 text-center">Rate</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700">{e.name}</td>
                    <td className="py-2 pr-4 text-slate-500">{e.designation ?? "—"}</td>
                    <td className="py-2 pr-4 text-center font-semibold">{e.total}</td>
                    <td className="py-2 pr-4 text-center text-amber-600">{e.active}</td>
                    <td className="py-2 pr-4 text-center text-emerald-600">{e.done}</td>
                    <td className="py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        e.total > 0 && e.done / e.total >= 0.7 ? "bg-emerald-100 text-emerald-700" :
                        e.total > 0 && e.done / e.total >= 0.4 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {e.total > 0 ? Math.round((e.done / e.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-slate-400">No employee data yet</div>
        )}
      </Card>
    </div>
  );
}
