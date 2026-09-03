"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { useParams } from "next/navigation";
import { ArrowLeft, User, MapPin, Calendar, Clock, CheckCircle, AlertTriangle, Plus, UserPlus } from "lucide-react";
import Link from "next/link";

export default function CmoComplaintDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDistrict, setShowAddDistrict] = useState(false);
  const [showAssignOfficer, setShowAssignOfficer] = useState(false);
  const [newDistrictName, setNewDistrictName] = useState("");
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [officers, setOfficers] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/complaints/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    // Load officers for assignment
    fetch("/api/cmo/officers")
      .then(r => r.json())
      .then(d => setOfficers(d.officers ?? []))
      .catch(() => {});
  }, [params.id]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  if (!data || !data.complaint) {
    return <div className="p-6 text-center text-red-600">Complaint not found</div>;
  }

  const { complaint, citizen, assignedEmployee, assignedOfficer, department, district, updates, history } = data;
  const isUnknownDistrict = !district && (complaint.area || complaint.tehsil);
  const locationDisplay = district?.name ?? (complaint.area || complaint.tehsil || "Unknown");

  async function handleAddDistrict() {
    if (!newDistrictName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/cmo/districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDistrictName.trim(), complaintId: complaint.id }),
      });
      const result = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: `District "${result.district.name}" added and complaint updated!` });
        setShowAddDistrict(false);
        setNewDistrictName("");
        // Refresh complaint data
        const d = await fetch(`/api/complaints/${params.id}`).then(r => r.json());
        setData(d);
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to add district" });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error" });
    }
    setActionLoading(false);
  }

  async function handleAssignOfficer() {
    if (!selectedOfficerId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerId: selectedOfficerId }),
      });
      const result = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "Officer assigned successfully!" });
        setShowAssignOfficer(false);
        setSelectedOfficerId("");
        const d = await fetch(`/api/complaints/${params.id}`).then(r => r.json());
        setData(d);
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to assign officer" });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error" });
    }
    setActionLoading(false);
  }

  return (
    <div className="p-6">
      <Link href="/cmo/complaints" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft size={16} /> Back to Complaints
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{complaint.complaint_code}</h1>
                <p className="mt-1 text-sm text-slate-500">{complaint.category} — {complaint.sub_category}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                complaint.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                complaint.status === "ASSIGNED" ? "bg-blue-100 text-blue-700" :
                complaint.status === "IN_PROGRESS" ? "bg-indigo-100 text-indigo-700" :
                complaint.status === "MARKED_RESOLVED" ? "bg-orange-100 text-orange-700" :
                complaint.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                "bg-red-100 text-red-700"
              }`}>
                {complaint.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-700">{complaint.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><MapPin size={14} /> {locationDisplay}{!district && complaint.area ? " Area" : " District"}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(complaint.created_at).toLocaleDateString()}</span>
              {complaint.address && <span className="flex items-center gap-1"><MapPin size={14} /> {complaint.address}</span>}
              {!district && complaint.latitude && complaint.longitude && (
                <span className="flex items-center gap-1"><MapPin size={14} /> {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}</span>
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Activity Timeline</h2>
            <div className="space-y-3">
              {history.map((h: any, i: number) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${
                      h.action === "COMPLAINT_SUBMITTED" ? "bg-blue-500" :
                      h.action === "ASSIGNED" ? "bg-indigo-500" :
                      h.action === "WORK_STARTED" ? "bg-cyan-500" :
                      h.action === "MARKED_RESOLVED" ? "bg-orange-500" :
                      h.action === "CITIZEN_VERIFIED_YES" ? "bg-emerald-500" :
                      "bg-slate-400"
                    }`} />
                    {i < history.length - 1 && <div className="w-0.5 flex-1 bg-slate-200" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="text-sm font-medium text-slate-900">{h.action.replace(/_/g, " ")}</div>
                    {h.description && <div className="text-xs text-slate-500">{h.description}</div>}
                    <div className="text-xs text-slate-400">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Citizen Info */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <User size={16} /> Citizen
            </h3>
            <div className="text-sm text-slate-600">{citizen?.name ?? "Unknown"}</div>
            <div className="text-xs text-slate-500">{citizen?.email}</div>
            {citizen?.phone && <div className="text-xs text-slate-500">{citizen.phone}</div>}
          </Card>

          {/* Department & District */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Department & District</h3>
            <div className="text-sm text-slate-600">{department?.name ?? "Unknown"}</div>
            <div className="text-xs text-slate-500">{locationDisplay}{!district ? (complaint.area ? " Area (not in database)" : " District (not in database)") : " District"}</div>
            {isUnknownDistrict && (
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => { setShowAddDistrict(!showAddDistrict); setShowAssignOfficer(false); setActionMessage(null); }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700"
                >
                  <Plus size={14} /> Add "{complaint.area || complaint.tehsil}" as District
                </button>
                <button
                  onClick={() => { setShowAssignOfficer(!showAssignOfficer); setShowAddDistrict(false); setActionMessage(null); }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand-600 px-3 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50"
                >
                  <UserPlus size={14} /> Assign Officer to this Complaint
                </button>
              </div>
            )}
            {showAddDistrict && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <label className="text-xs font-medium text-slate-700">New District Name</label>
                <input
                  value={newDistrictName}
                  onChange={e => setNewDistrictName(e.target.value)}
                  placeholder={complaint.area || complaint.tehsil || "Enter district name"}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleAddDistrict}
                    disabled={actionLoading || !newDistrictName.trim()}
                    className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Adding..." : "Add District"}
                  </button>
                  <button
                    onClick={() => setShowAddDistrict(false)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {showAssignOfficer && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <label className="text-xs font-medium text-slate-700">Select Officer</label>
                <select
                  value={selectedOfficerId}
                  onChange={e => setSelectedOfficerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">-- Select Officer --</option>
                  {officers.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                  ))}
                </select>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleAssignOfficer}
                    disabled={actionLoading || !selectedOfficerId}
                    className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Assigning..." : "Assign Officer"}
                  </button>
                  <button
                    onClick={() => setShowAssignOfficer(false)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {actionMessage && (
              <div className={`mt-3 rounded-lg p-2 text-xs ${actionMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {actionMessage.text}
              </div>
            )}
          </Card>

          {/* Assigned Officer */}
          {assignedOfficer && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Assigned Officer</h3>
              <div className="text-sm text-slate-600">{assignedOfficer.name}</div>
              <div className="text-xs text-slate-500">{assignedOfficer.email}</div>
            </Card>
          )}

          {/* Assigned Employee */}
          {assignedEmployee && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Assigned Employee</h3>
              <div className="text-sm text-slate-600">{assignedEmployee.name}</div>
              <div className="text-xs text-slate-500">{assignedEmployee.designation}</div>
              {assignedEmployee.phone && <div className="text-xs text-slate-500">{assignedEmployee.phone}</div>}
            </Card>
          )}

          {/* Deadline */}
          {complaint.deadline && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Clock size={16} /> Deadline
              </h3>
              <div className={`text-sm font-medium ${
                new Date(complaint.deadline) < new Date() && complaint.status !== "RESOLVED"
                  ? "text-red-600"
                  : "text-slate-700"
              }`}>
                {new Date(complaint.deadline).toLocaleDateString()}
              </div>
              {complaint.status === "RESOLVED" && complaint.resolved_at && (
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle size={14} /> Resolved {new Date(complaint.resolved_at).toLocaleDateString()}
                </div>
              )}
            </Card>
          )}

          {/* Verification */}
          {complaint.citizen_verification && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Citizen Verification</h3>
              <div className={`flex items-center gap-2 text-sm font-medium ${
                complaint.citizen_verification === "YES" ? "text-emerald-600" : "text-red-600"
              }`}>
                {complaint.citizen_verification === "YES" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {complaint.citizen_verification === "YES" ? "Confirmed Resolved" : "Disputed — Not Resolved"}
              </div>
              {complaint.citizen_remarks && (
                <div className="mt-2 text-xs text-slate-500">{complaint.citizen_remarks}</div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
