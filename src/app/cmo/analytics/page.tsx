"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

export default function CmoAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cmo/analytics")
      .then(r => r.json())
      .then(d => { setAnalytics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  if (!analytics) {
    return <div className="p-6 text-center text-red-600">Failed to load analytics</div>;
  }

  const { department, kpis, statusBreakdown, districtStats, officerPerformance } = analytics;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{department?.name ?? "Department"} — Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Detailed analytics and performance metrics</p>
      </div>

      {/* District-wise Comparison */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">District-wise Performance</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {districtStats.map((ds: any) => {
            const total = ds.totalComplaints || 1;
            const resolvedPct = Math.round((ds.resolved / total) * 100);
            const pendingPct = Math.round((ds.pending / total) * 100);
            return (
              <Card key={ds.district.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{ds.district.name}</h3>
                  {!ds.hasOfficer && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      No Officer
                    </span>
                  )}
                </div>
                {/* Progress bars */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Resolved</span>
                      <span>{ds.resolved}/{ds.totalComplaints}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${resolvedPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Pending</span>
                      <span>{ds.pending}/{ds.totalComplaints}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-amber-500" style={{ width: `${pendingPct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <div><div className="font-bold text-slate-900">{ds.totalComplaints}</div><div className="text-slate-500">Total</div></div>
                  <div><div className="font-bold text-amber-600">{ds.pending}</div><div className="text-slate-500">Pending</div></div>
                  <div><div className="font-bold text-indigo-600">{ds.inProgress}</div><div className="text-slate-500">In Progress</div></div>
                  <div><div className="font-bold text-emerald-600">{ds.resolved}</div><div className="text-slate-500">Resolved</div></div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Officer Performance */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Officer Performance</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Officer</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">District</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Assigned</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Resolved</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Pending</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Rate</th>
              </tr>
            </thead>
            <tbody>
              {officerPerformance.map((op: any) => (
                <tr key={op.officer.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{op.officer.name}</div>
                    <div className="text-xs text-slate-500">{op.officer.designation}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{op.district}</td>
                  <td className="px-4 py-3 text-center font-medium">{op.totalAssigned}</td>
                  <td className="px-4 py-3 text-center font-medium text-emerald-600">{op.resolved}</td>
                  <td className="px-4 py-3 text-center font-medium text-amber-600">{op.pending}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      op.resolutionRate >= 70 ? "bg-emerald-100 text-emerald-700" :
                      op.resolutionRate >= 40 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {op.resolutionRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {officerPerformance.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No officers assigned yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Status Breakdown</h2>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className={`text-2xl font-bold ${
                  status === "PENDING" ? "text-amber-600" :
                  status === "ASSIGNED" ? "text-blue-600" :
                  status === "IN_PROGRESS" ? "text-indigo-600" :
                  status === "MARKED_RESOLVED" ? "text-orange-600" :
                  status === "RESOLVED" ? "text-emerald-600" :
                  "text-red-600"
                }`}>
                  {count as number}
                </div>
                <div className="text-xs text-slate-500">{status.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
