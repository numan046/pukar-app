"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { CheckCircle2, Circle, Clock, User, Camera, Upload } from "lucide-react";

export default function EmployeeComplaintDetail() {
  const params = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<any>(null);
  const [citizen, setCitizen] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Progress update
  const [progressMsg, setProgressMsg] = useState("");
  const [progressFiles, setProgressFiles] = useState<string[]>([]);
  const [uploadingProgress, setUploadingProgress] = useState(false);

  // Resolve
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionFiles, setResolutionFiles] = useState<string[]>([]);
  const [showResolve, setShowResolve] = useState(false);
  const [uploadingResolve, setUploadingResolve] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const resolveFileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch(`/api/complaints/${params.id}`).then(r => r.json()).then(d => {
      if (d.complaint) {
        setComplaint(d.complaint); setCitizen(d.citizen);
        setUpdates(d.updates ?? []); setHistory(d.history ?? []);
      }
    }).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [params.id]);

  async function startWork() {
    setBusy(true); setError(null);
    const res = await fetch(`/api/complaints/${params.id}/progress`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start_work" }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else load();
    setBusy(false);
  }

  async function addProgress() {
    if (!progressMsg.trim()) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/complaints/${params.id}/progress`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_progress", message: progressMsg, proofData: progressFiles.length ? JSON.stringify(progressFiles) : null }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setProgressMsg(""); setProgressFiles([]); load(); }
    setBusy(false);
  }

  async function markResolved() {
    if (!resolutionNote.trim() || resolutionFiles.length === 0) {
      setError("Resolution note and at least one proof image/video are required."); return;
    }
    setBusy(true); setError(null);
    const res = await fetch(`/api/complaints/${params.id}/resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionNote, proofData: JSON.stringify(resolutionFiles) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setShowResolve(false); setResolutionNote(""); setResolutionFiles([]); load(); }
    setBusy(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, target: "progress" | "resolve") {
    const file = e.target.files?.[0];
    if (!file) return;
    if (target === "progress") setUploadingProgress(true);
    else setUploadingResolve(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        if (target === "progress") setProgressFiles(f => [...f, data.url]);
        else setResolutionFiles(f => [...f, data.url]);
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch {
      setError("Upload failed. Please try again.");
    }
    if (target === "progress") setUploadingProgress(false);
    else setUploadingResolve(false);
    e.target.value = "";
  }

  function removeFile(target: "progress" | "resolve", index: number) {
    if (target === "progress") setProgressFiles(f => f.filter((_, i) => i !== index));
    else setResolutionFiles(f => f.filter((_, i) => i !== index));
  }

  if (loading || !complaint) return <div className="p-10 text-center text-slate-400">Loading complaint…</div>;

  const isOverdue = complaint.deadline && new Date(complaint.deadline) < new Date() && !["RESOLVED", "MARKED_RESOLVED"].includes(complaint.status);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-slate-400">{complaint.complaint_code}</div>
          <h1 className="text-xl font-bold text-slate-900">{complaint.title || complaint.category || "Complaint"}</h1>
          <div className="mt-1 text-sm text-slate-500">{complaint.category}{complaint.area ? ` · ${complaint.area}` : ""}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={complaint.status} />
          {isOverdue && <span className="text-xs font-bold text-red-600">⚠ Overdue</span>}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 md:grid-cols-3">
        {/* Main Column */}
        <div className="flex flex-col gap-5 md:col-span-2">
          {/* Description */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-700">Description</div>
            <p className="mt-2 text-sm text-slate-700">{complaint.description}</p>
            {complaint.assignment_instructions && (
              <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                <div className="text-xs font-semibold uppercase">Instructions from Officer</div>
                {complaint.assignment_instructions}
              </div>
            )}
          </Card>

          {/* Actions Panel */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-700">Your Actions</div>

            {complaint.status === "ASSIGNED" && (
              <div className="mt-3">
                <Button onClick={startWork} disabled={busy}>▶ Start Work</Button>
                <p className="mt-1 text-xs text-slate-500">Click to begin working on this complaint</p>
              </div>
            )}

            {complaint.status === "IN_PROGRESS" && (
              <div className="mt-3 flex flex-col gap-4">
                {/* Add Progress */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="text-xs font-semibold uppercase text-slate-500">Add Progress Update</div>
                  <textarea placeholder="Describe what you've done so far…" value={progressMsg} onChange={e => setProgressMsg(e.target.value)}
                    rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <Camera size={14} /> {uploadingProgress ? "Uploading…" : "Add Photo"}
                      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" disabled={uploadingProgress} onChange={e => handleFileUpload(e, "progress")} />
                    </label>
                    {progressFiles.length > 0 && <span className="text-xs text-emerald-600">{progressFiles.length} file(s) attached</span>}
                  </div>
                  {progressFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {progressFiles.map((url, i) => (
                        <div key={i} className="relative group">
                          {url.match(/\.(mp4|webm|mov)/i) || url.startsWith("data:video")
                            ? <video src={url} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                            : <img src={url} alt="Proof" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />}
                          <button type="button" onClick={() => removeFile("progress", i)} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button className="mt-2" disabled={busy || !progressMsg.trim()} onClick={addProgress}>
                    {busy ? "Saving…" : "Add Update"}
                  </Button>
                </div>

                {/* Mark Resolved */}
                {!showResolve ? (
                  <Button variant="secondary" onClick={() => setShowResolve(true)}>✓ Mark as Resolved</Button>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-sm font-bold text-emerald-800">Mark as Resolved</div>
                    <p className="mt-1 text-xs text-emerald-700">You must provide a resolution note and at least one proof image/video.</p>
                    <textarea placeholder="Describe how the problem was resolved…" value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
                      rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                    <div className="mt-2 flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        <Upload size={14} /> {uploadingResolve ? "Uploading…" : "Upload Proof"}
                        <input ref={resolveFileRef} type="file" accept="image/*,video/*" className="hidden" disabled={uploadingResolve} onChange={e => handleFileUpload(e, "resolve")} />
                      </label>
                      {resolutionFiles.length > 0 && <span className="text-xs text-emerald-600">{resolutionFiles.length} proof file(s)</span>}
                    </div>
                    {resolutionFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {resolutionFiles.map((url, i) => (
                          <div key={i} className="relative group">
                            {url.startsWith("data:video")
                              ? <video src={url} className="h-16 w-16 rounded-lg border border-emerald-200 object-cover" />
                              : <img src={url} alt="Proof" className="h-16 w-16 rounded-lg border border-emerald-200 object-cover" />}
                            <button type="button" onClick={() => removeFile("resolve", i)} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setShowResolve(false)}>Cancel</Button>
                      <Button className="flex-1" disabled={busy} onClick={markResolved}>
                        {busy ? "Submitting…" : "Confirm Resolution"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {["RESOLVED", "MARKED_RESOLVED"].includes(complaint.status) && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                This complaint has been marked as resolved. Waiting for citizen verification.
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-700">Activity Timeline</div>
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
                              ? <video key={i} src={url} controls className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
                              : <img key={i} src={url} alt="Proof" className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
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
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {citizen && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><User size={14} /> Citizen Info</div>
              <div className="mt-2 space-y-1 text-sm">
                <div><span className="text-slate-500">Name:</span> {citizen.name}</div>
                <div><span className="text-slate-500">Email:</span> {citizen.email}</div>
                {citizen.phone && <div><span className="text-slate-500">Phone:</span> {citizen.phone}</div>}
              </div>
            </Card>
          )}

          {complaint.deadline && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock size={14} /> Deadline</div>
              <div className={`mt-1 text-sm ${isOverdue ? "font-bold text-red-600" : "text-slate-700"}`}>
                {new Date(complaint.deadline).toLocaleDateString()}
                {isOverdue && " — OVERDUE"}
              </div>
            </Card>
          )}

          {complaint.resolution_note && (
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="text-sm font-semibold text-emerald-800">Resolution Note</div>
              <p className="mt-1 text-sm text-emerald-700">{complaint.resolution_note}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
