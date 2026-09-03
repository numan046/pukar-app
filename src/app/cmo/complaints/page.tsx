"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function CmoComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/cmo/complaints").then(r => r.json()),
      fetch("/api/cmo/districts").then(r => r.json()),
    ]).then(([cData, dData]) => {
      setComplaints(cData.complaints ?? []);
      setDistricts(dData.districts ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getDistrictName = (c: any) => {
    if (c.district_id) {
      return districts.find((d: any) => d.id === c.district_id)?.name ?? "Unknown";
    }
    // Use resolved district from API (reverse geocoded)
    if (c.resolvedDistrict) return c.resolvedDistrict;
    // Show area/tehsil name for unknown districts
    return c.area || c.tehsil || "Unknown";
  };

  const filtered = complaints.filter(c => {
    if (filterDistrict) {
      const selectedName = districts.find((d: any) => d.id === filterDistrict)?.name ?? "";
      const displayName = getDistrictName(c);
      // Match by district_id OR by displayed name (case-insensitive)
      if (c.district_id !== filterDistrict && displayName.toLowerCase() !== selectedName.toLowerCase()) return false;
    }
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">All Complaints</h1>
        <p className="mt-1 text-sm text-slate-500">View and monitor all complaints across districts</p>
      </div>

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">District</label>
            <select
              value={filterDistrict}
              onChange={e => setFilterDistrict(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Districts</option>
              {districts.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="MARKED_RESOLVED">Marked Resolved</option>
              <option value="RESOLVED">Resolved</option>
              <option value="OFFICER_REVIEW">Officer Review</option>
            </select>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-slate-500">{filtered.length} complaints</span>
          </div>
        </div>
      </Card>

      {/* Complaints Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">District</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/cmo/complaints/${c.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.complaint_code}</td>
                  <td className="px-4 py-3 text-slate-600">{c.category ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {getDistrictName(c)}
                    {!c.district_id && c.area && <span className="ml-1 text-xs text-amber-600">(Area)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                      c.status === "ASSIGNED" ? "bg-blue-100 text-blue-700" :
                      c.status === "IN_PROGRESS" ? "bg-indigo-100 text-indigo-700" :
                      c.status === "MARKED_RESOLVED" ? "bg-orange-100 text-orange-700" :
                      c.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No complaints found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
