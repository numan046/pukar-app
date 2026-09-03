"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";

export default function CitizenComplaintDetail() {
  const params = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification
  const [verifyResponse, setVerifyResponse] = useState<"YES" | "NO" | null>(null);
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/complaints/${params.id}`).then(r => r.json()).then(d => {
      if (d.complaint) {
        setComplaint(d.complaint); setEmployee(d.assignedEmployee);
        setDepartment(d.department); setUpdates(d.updates ?? []); setHistory(d.history ?? []);
      }
    }).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [params.id]);

  async function submitVerification() {
    if (!verifyResponse) return;
    setBusy(true); setVerifyError(null);
    const res = await fetch(`/api/complaints/${params.id}/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: verifyResponse, remarks: verifyRemarks || undefined }),
    });
    if (!res.ok) { const d = await res.json(); setVerifyError(d.error || "Failed."); }
    else load();
    setBusy(false);
  }

  if (loading || !complaint) return <div className="p-10 text-center text-slate-400">Loading complaint…</div>;

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
          <div className="mt-1 text-sm text-slate-500">
            {department?.name}{complaint.category ? ` · ${complaint.category}` : ""}
          </div>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      {/* Status Flow */}
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-700">Progress</div>
        <div className="mt-3 flex items-center gap-1">
          {STATUS_FLOW.map((s, idx) => {
            const reached = idx <= reachedIdx || isReview;
            return (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div className={`h-1.5 w-full rounded-full ${reached ? "bg-brand-600" : "bg-slate-200"}`} />
                <span className={`mt-1 text-[9px] font-medium text-center ${reached ? "text-brand-700" : "text-slate-400"}`}>
                  {s === "MARKED_RESOLVED" ? "Awaiting Verify" : s.replace("_", " ")}
                </span>
              </div>
            );
          })}
        </div>
        {isReview && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle size={14} /> Your complaint is under officer review because you reported it as not resolved.
          </div>
        )}
      </Card>

      {/* Verification Panel */}
      {complaint.status === "MARKED_RESOLVED" && (
        <Card className="p-5 border-orange-200 bg-orange-50">
          <div className="text-base font-bold text-orange-800">Is this problem solved?</div>
          <p className="mt-1 text-sm text-orange-700">
            The employee has marked your complaint as resolved. Please verify whether the problem has actually been fixed.
          </p>
          {complaint.resolution_note && (
            <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">
              <div className="text-xs font-semibold uppercase text-slate-500">Resolution Note</div>
              {complaint.resolution_note}
            </div>
          )}
          {complaint.resolution_proof && complaint.resolution_proof !== "[]" && complaint.resolution_proof !== "null" && (() => {
            let proofUrls: string[] = [];
            try { proofUrls = JSON.parse(complaint.resolution_proof); } catch {}
            return proofUrls.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {proofUrls.map((url: string, i: number) =>
                  url.match(/\.(mp4|webm|mov)$/i) || url.startsWith("data:video")
                    ? <a key={i} href={url} target="_blank" rel="noopener noreferrer"><video src={url} controls className="h-24 w-24 sm:h-28 sm:w-28 rounded-lg border border-slate-200 object-cover hover:border-brand-400 transition-colors" /></a>
                    : <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Resolution proof" className="h-24 w-24 sm:h-28 sm:w-28 rounded-lg border border-slate-200 object-cover hover:border-brand-400 transition-colors" /></a>
                )}
              </div>
            ) : null;
          })()}

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button onClick={() => setVerifyResponse("YES")}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-bold transition ${verifyResponse === "YES" ? "border-emerald-500 bg-emerald-100 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`}>
              ✓ Yes, Solved!
            </button>
            <button onClick={() => setVerifyResponse("NO")}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-bold transition ${verifyResponse === "NO" ? "border-red-500 bg-red-100 text-red-800" : "border-slate-200 bg-white text-slate-600 hover:border-red-300"}`}>
              ✗ No, Not Solved
            </button>
          </div>

          {verifyResponse && (
            <div className="mt-3">
              <textarea placeholder="Remarks (optional) — tell us what's still wrong or confirm it's fixed"
                value={verifyRemarks} onChange={e => setVerifyRemarks(e.target.value)}
                rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              {verifyError && <div className="mt-2 text-xs text-red-600">{verifyError}</div>}
              <Button className="mt-2 w-full" disabled={busy} onClick={submitVerification}>
                {busy ? "Submitting…" : "Submit Verification"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Already Verified */}
      {complaint.citizen_verification && (
        <Card className={`p-4 ${complaint.citizen_verification === "YES" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="text-sm font-bold">
            {complaint.citizen_verification === "YES" ? "✓ You confirmed this is resolved" : "✗ You reported this is NOT resolved"}
          </div>
          {complaint.citizen_remarks && <div className="mt-1 text-xs text-slate-600">Your remarks: {complaint.citizen_remarks}</div>}
        </Card>
      )}

      {/* Resolved confirmation */}
      {complaint.status === "RESOLVED" && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
          <div className="mt-2 text-lg font-bold text-emerald-800">Complaint Resolved</div>
          <p className="text-sm text-emerald-700">This complaint has been confirmed as resolved.</p>
        </Card>
      )}

      {/* Description */}
      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-700">Your Report</div>
        <p className="mt-2 text-sm text-slate-700">{complaint.description}</p>
        {media.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {media.map((url: string, i: number) =>
              url.match(/\.(mp4|webm|mov)$/i) || url.startsWith("data:video")
                ? <a key={i} href={url} target="_blank" rel="noopener noreferrer"><video src={url} controls className="h-24 w-24 sm:h-32 sm:w-32 rounded-lg object-cover hover:opacity-80 transition-opacity" /></a>
                : <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Evidence" className="h-24 w-24 sm:h-32 sm:w-32 rounded-lg object-cover hover:opacity-80 transition-opacity" /></a>
            )}
          </div>
        )}
      </Card>

      {/* Activity Timeline */}
      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-700">Activity</div>
        <div className="mt-3 flex flex-col gap-3">
          {updates.map((u: any) => {
            let proofUrls: string[] = [];
            try { if (u.proof_data && u.proof_data !== "[]" && u.proof_data !== "null") proofUrls = JSON.parse(u.proof_data); } catch {}
            return (
              <div key={u.id} className="flex gap-3">
                <div className="mt-1"><CheckCircle2 size={14} className="text-brand-600" /></div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-500 uppercase">{u.update_type.replace("_", " ")}</div>
                  <div className="text-sm text-slate-700">{u.message}</div>
                  <div className="text-[10px] text-slate-400">{new Date(u.created_at).toLocaleString()}</div>
                  {proofUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {proofUrls.map((url: string, i: number) =>
                        url.match(/\.(mp4|webm|mov)$/i) || url.startsWith("data:video")
                          ? <a key={i} href={url} target="_blank" rel="noopener noreferrer"><video src={url} controls className="h-28 w-28 rounded-lg border border-slate-200 object-cover hover:border-brand-400 transition-colors" /></a>
                          : <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Proof" className="h-28 w-28 rounded-lg border border-slate-200 object-cover hover:border-brand-400 transition-colors" /></a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {updates.length === 0 && <div className="text-sm text-slate-400">No activity yet</div>}
        </div>
      </Card>

      {/* Employee info */}
      {employee && (
        <Card className="p-4">
          <div className="text-sm font-semibold text-slate-700">Assigned Employee</div>
          <div className="mt-1 text-sm text-slate-600">{employee.name}{employee.designation ? ` — ${employee.designation}` : ""}</div>
          {employee.phone && <div className="mt-1 text-sm text-blue-600">📞 {employee.phone}</div>}
        </Card>
      )}

      {/* Deadline */}
      {complaint.deadline && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock size={14} /> Deadline</div>
          <div className="mt-1 text-sm text-slate-600">{new Date(complaint.deadline).toLocaleDateString()}</div>
        </Card>
      )}
    </div>
  );
}
