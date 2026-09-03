"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { CheckCircle2, Circle, Clock, User, AlertTriangle } from "lucide-react";

export default function OfficerComplaintDetail() {
  const params = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<any>(null);
  const [citizen, setCitizen] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  // Dispute panel
  const [disputeAction, setDisputeAction] = useState("");
  const [disputeNote, setDisputeNote] = useState("");
  const [reassignId, setReassignId] = useState("");

  function load() {
    setLoading(true);
    fetch(`/api/complaints/${params.id}`).then(r => r.json()).then(d => {
      if (d.complaint) {
        setComplaint(d.complaint); setCitizen(d.citizen); setEmployee(d.assignedEmployee);
        setDepartment(d.department); setUpdates(d.updates ?? []); setHistory(d.history ?? []);
      }
    });
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []));
    setLoading(false);
  }
  useEffect(() => { load(); }, [params.id]);

  async function assignEmployee() {
    if (!assignEmployeeId || !assignDeadline) return;
    setBusy(true);
    const res = await fetch(`/api/complaints/${params.id}/assign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: assignEmployeeId, deadline: assignDeadline, instructions: assignInstructions }),
    });
    if (res.ok) { setShowAssign(false); load(); }
    setBusy(false);
  }

  async function handleDispute(action: string) {
    setBusy(true);
    const res = await fetch(`/api/complaints/${params.id}/dispute-action`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: disputeNote, newEmployeeId: action === "REASSIGN" ? reassignId : undefined }),
    });
    if (res.ok) { setDisputeAction(""); setDisputeNote(""); load(); }
    setBusy(false);
  }

  if (loading || !complaint) return <div className="p-10 text-center text-slate-400">Loading complaint…</div>;

  const isOverdue = complaint.deadline && new Date(complaint.deadline) < new Date() && !["RESOLVED"].includes(complaint.status);
  const media = JSON.parse(complaint.media_urls || "[]") as string[];

  const STATUS_FLOW = ["PENDING", "ASSIGNED", "IN_PROGRESS", "MARKED_RESOLVED", "RESOLVED"];
  const reachedIdx = STATUS_FLOW.indexOf(complaint.status);
  const isReview = complaint.status === "OFFICER_REVIEW";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-slate-400">{complaint.complaint_code}</div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{complaint.title || complaint.category || "Complaint"}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {department && <span>{department.name}</span>}
            {complaint.category && <span>· {complaint.category}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {complaint.priority && (
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                complaint.priority === "P0" ? "bg-red-100 text-red-700 border-red-200" :
                complaint.priority === "P1" ? "bg-orange-100 text-orange-700 border-orange-200" :
                complaint.priority === "P2" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                "bg-green-100 text-green-700 border-green-200"
              }`}>
                AI Priority: {complaint.priority}
              </span>
            )}
            <StatusBadge status={complaint.status} />
          </div>
          {isOverdue && <span className="flex items-center gap-1 text-xs font-bold text-red-600"><AlertTriangle size={12} /> Overdue</span>}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Main Column */}
        <div className="flex flex-col gap-5 md:col-span-2">
          {/* Description */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-700">Description</div>
            <p className="mt-2 text-sm text-slate-700">{complaint.description}</p>
            {media.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {media.map((url: string, i: number) =>
                  url.match(/\.(mp4|webm|mov)$/i) || url.startsWith("data:video")
                    ? <video key={i} src={url} controls className="h-24 w-24 sm:h-32 sm:w-32 rounded-lg object-cover" />
                    : <img key={i} src={url} alt="Evidence" className="h-24 w-24 sm:h-32 sm:w-32 rounded-lg object-cover" />
                )}
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-700">Timeline</div>
            {/* Status flow */}
            <div className="mt-3 flex items-center gap-1">
              {STATUS_FLOW.map((s, idx) => {
                const reached = idx <= reachedIdx || isReview;
                return (
                  <div key={s} className="flex flex-1 flex-col items-center">
                    <div className={`h-1.5 w-full rounded-full ${reached ? "bg-brand-600" : "bg-slate-200"}`} />
                    <span className={`mt-1 text-[9px] font-medium ${reached ? "text-brand-700" : "text-slate-400"}`}>{s.replace("_", " ")}</span>
                  </div>
                );
              })}
            </div>
            {isReview && <div className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">⚠ Citizen disputes resolution — Under Officer Review</div>}

            {/* Updates */}
            <div className="mt-4 flex flex-col gap-3">
              {updates.map((u: any) => {
                let proofUrls: string[] = [];
                try { if (u.proof_data && u.proof_data !== "[]" && u.proof_data !== "null") proofUrls = JSON.parse(u.proof_data); } catch {}
                return (
                  <div key={u.id} className="flex gap-3">
                    <div className="mt-1"><CheckCircle2 size={14} className="text-brand-600" /></div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-700">{u.update_type.replace("_", " ")}</div>
                      <div className="text-sm text-slate-600">{u.message}</div>
                      <div className="text-[10px] text-slate-400">{new Date(u.created_at).toLocaleString()}</div>
                      {proofUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {proofUrls.map((url: string, i: number) =>
                            url.match(/\.(mp4|webm|mov)$/i) || url.startsWith("data:video")
                              ? <video key={i} src={url} controls className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
                              : <img key={i} src={url} alt="Proof" className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {updates.length === 0 && <div className="text-sm text-slate-400">No updates yet</div>}
            </div>
          </Card>

          {/* Audit History */}
          {history.length > 0 && (
            <Card className="p-5">
              <div className="text-sm font-semibold text-slate-700">Audit Trail</div>
              <div className="mt-3 flex flex-col gap-2">
                {history.map((h: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <Circle size={8} className="mt-1 text-slate-400" />
                    <div>
                      <span className="font-medium text-slate-700">{h.action.replace(/_/g, " ")}</span>
                      {h.old_status && h.new_status && <span className="text-slate-500"> ({h.old_status} → {h.new_status})</span>}
                      {h.description && <span className="text-slate-500"> — {h.description}</span>}
                      <div className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Citizen Info */}
          {citizen && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><User size={14} /> Citizen</div>
              <div className="mt-2 space-y-1 text-sm">
                <div><span className="text-slate-500">Name:</span> {citizen.name}</div>
                <div><span className="text-slate-500">Email:</span> {citizen.email}</div>
                {citizen.phone && <div><span className="text-slate-500">Phone:</span> {citizen.phone}</div>}
              </div>
            </Card>
          )}

          {/* Employee Info */}
          {employee && (
            <Card className="p-4">
              <div className="text-sm font-semibold text-slate-700">Assigned Employee</div>
              <div className="mt-2 space-y-1 text-sm">
                <div><span className="text-slate-500">Name:</span> {employee.name}</div>
                <div><span className="text-slate-500">Email:</span> {employee.email}</div>
                {employee.designation && <div><span className="text-slate-500">Role:</span> {employee.designation}</div>}
              </div>
            </Card>
          )}

          {/* Deadline */}
          {complaint.deadline && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock size={14} /> Deadline</div>
              <div className={`mt-1 text-sm ${isOverdue ? "font-bold text-red-600" : "text-slate-700"}`}>
                {new Date(complaint.deadline).toLocaleDateString()}
                {isOverdue && " — OVERDUE"}
              </div>
            </Card>
          )}

          {/* Citizen Verification */}
          {complaint.citizen_verification && (
            <Card className={`p-4 ${complaint.citizen_verification === "YES" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="text-sm font-semibold">Citizen Verification</div>
              <div className={`text-sm font-bold ${complaint.citizen_verification === "YES" ? "text-emerald-700" : "text-red-700"}`}>
                {complaint.citizen_verification === "YES" ? "✓ Confirmed Solved" : "✗ Reports Not Solved"}
              </div>
              {complaint.citizen_remarks && <div className="mt-1 text-xs text-slate-600">Remarks: {complaint.citizen_remarks}</div>}
            </Card>
          )}

          {/* Resolution Proof */}
          {complaint.resolution_proof && complaint.resolution_proof !== "[]" && complaint.resolution_proof !== "null" && (() => {
            let proofUrls: string[] = [];
            try { proofUrls = JSON.parse(complaint.resolution_proof); } catch {}
            return proofUrls.length > 0 ? (
              <Card className="p-4 bg-emerald-50 border-emerald-200">
                <div className="text-sm font-semibold text-emerald-800">Resolution Proof</div>
                {complaint.resolution_note && <p className="mt-1 text-sm text-emerald-700">{complaint.resolution_note}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {proofUrls.map((url: string, i: number) =>
                    url.match(/\.(mp4|webm|mov)$/i) || url.startsWith("data:video")
                      ? <video key={i} src={url} controls className="h-28 w-28 rounded-lg border border-emerald-300 object-cover" />
                      : <img key={i} src={url} alt="Resolution proof" className="h-28 w-28 rounded-lg border border-emerald-300 object-cover" />
                  )}
                </div>
              </Card>
            ) : null;
          })()}

          {/* Actions */}
          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-700">Actions</div>
            <div className="mt-3 flex flex-col gap-2">
              {(complaint.status === "PENDING" || complaint.status === "OFFICER_REVIEW") && (
                <Button onClick={() => setShowAssign(true)}>
                  {complaint.status === "PENDING" ? "Assign Employee" : "Reassign Employee"}
                </Button>
              )}

              {/* Dispute Resolution */}
              {complaint.status === "OFFICER_REVIEW" && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="text-xs font-bold text-red-700 uppercase">Dispute Resolution</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <button onClick={() => handleDispute("RETURN_TO_IN_PROGRESS")} disabled={busy}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                      ↩ Return to In Progress
                    </button>
                    <button onClick={() => handleDispute("RESOLVE_MANUALLY")} disabled={busy}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">
                      ✓ Resolve Manually
                    </button>
                    <button onClick={() => handleDispute("KEEP_UNDER_REVIEW")} disabled={busy}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                      ⏸ Keep Under Review
                    </button>
                  </div>
                  <textarea placeholder="Note (optional)" value={disputeNote} onChange={e => setDisputeNote(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500" rows={2} />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-0">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Assign Employee</h2>
            <div className="mt-4 flex flex-col gap-3">
              <select value={assignEmployeeId} onChange={e => setAssignEmployeeId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                <option value="">Select Employee</option>
                {employees.filter((e: any) => e.is_active).map((e: any) => (
                  <option key={e.id} value={e.id}>{e.name} {e.designation ? `(${e.designation})` : ""}</option>
                ))}
              </select>
              <div>
                <label className="text-xs font-medium text-slate-500">Deadline</label>
                <input type="date" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <textarea placeholder="Instructions (optional)" value={assignInstructions} onChange={e => setAssignInstructions(e.target.value)}
                rows={3} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button className="flex-1" disabled={busy || !assignEmployeeId || !assignDeadline} onClick={assignEmployee}>
                {busy ? "Assigning…" : "Assign"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
