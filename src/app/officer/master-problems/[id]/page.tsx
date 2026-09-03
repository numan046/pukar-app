"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { Users, MapPin, Clock, AlertTriangle, CheckCircle2, User, FolderKanban } from "lucide-react";
import type { MasterProblemRow } from "@/types";

interface ComplaintWithCitizen {
  id: string;
  complaint_code: string;
  description: string;
  category: string | null;
  status: string;
  area: string | null;
  created_at: string;
  citizen: { id: string; name: string; email: string; phone: string | null } | null;
}

export default function MasterProblemDetail() {
  const params = useParams<{ id: string }>();
  const [masterProblem, setMasterProblem] = useState<MasterProblemRow | null>(null);
  const [complaints, setComplaints] = useState<ComplaintWithCitizen[]>([]);
  const [assignedEmployee, setAssignedEmployee] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [district, setDistrict] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/master-problems/${params.id}`).then(r => r.json()).then(d => {
      if (d.masterProblem) {
        setMasterProblem(d.masterProblem);
        setComplaints(d.complaints ?? []);
        setAssignedEmployee(d.assignedEmployee);
        setDepartment(d.department);
        setDistrict(d.district);
      }
    }).finally(() => setLoading(false));
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []));
  }

  useEffect(() => { load(); }, [params.id]);

  async function assignEmployee() {
    if (!assignEmployeeId || !assignDeadline) return;
    setBusy(true);
    const res = await fetch(`/api/master-problems/${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: assignEmployeeId, deadline: assignDeadline, instructions: assignInstructions }),
    });
    if (res.ok) {
      setShowAssign(false);
      load();
    }
    setBusy(false);
  }

  if (loading || !masterProblem) return <div className="p-10 text-center text-slate-400">Loading master problem…</div>;

  const priorityColor = (p: string) => {
    switch (p) {
      case "P0": return "bg-red-100 text-red-700 border-red-200";
      case "P1": return "bg-orange-100 text-orange-700 border-orange-200";
      case "P2": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-green-100 text-green-700 border-green-200";
    }
  };

  const isOverdue = masterProblem.deadline && new Date(masterProblem.deadline) < new Date() && masterProblem.status !== "RESOLVED";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban size={20} className="text-indigo-600" />
            <span className="font-mono text-sm text-slate-400">{masterProblem.code}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{masterProblem.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {department && <span>{department.name}</span>}
            {district && <span>• {district.name}</span>}
            {masterProblem.area && <span>• {masterProblem.area}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${priorityColor(masterProblem.priority)}`}>
            {masterProblem.priority}
          </span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            masterProblem.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
            masterProblem.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
            "bg-amber-100 text-amber-700"
          }`}>{masterProblem.status}</span>
          {isOverdue && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-600">
              <AlertTriangle size={12} /> OVERDUE
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-purple-600">{masterProblem.complaint_count}</div>
              <div className="text-xs font-medium text-slate-500">Citizens Affected</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-blue-600" />
            <div>
              <div className="text-sm font-semibold text-slate-700">{masterProblem.area || "Area"}</div>
              <div className="text-xs text-slate-500">Location</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-amber-600" />
            <div>
              <div className="text-sm font-semibold text-slate-700">
                {masterProblem.deadline ? new Date(masterProblem.deadline).toLocaleDateString() : "Not set"}
              </div>
              <div className="text-xs text-slate-500">Deadline</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <div>
              <div className="text-sm font-semibold text-slate-700">{masterProblem.category || "—"}</div>
              <div className="text-xs text-slate-500">Category</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Main Column - Affected Citizens */}
        <div className="flex flex-col gap-5 md:col-span-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              <div className="text-sm font-semibold text-slate-700">Affected Citizens ({complaints.length})</div>
            </div>
            <p className="mt-1 text-xs text-slate-500">All citizens who reported this same problem</p>
            <div className="mt-4 flex flex-col gap-3">
              {complaints.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500">{c.complaint_code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>{c.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{c.description.slice(0, 150)}{c.description.length > 150 ? "..." : ""}</p>
                  {c.citizen && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <User size={12} />
                      <span className="font-medium">{c.citizen.name}</span>
                      <span>•</span>
                      <span>{c.citizen.email}</span>
                      {c.citizen.phone && (
                        <>
                          <span>•</span>
                          <span>{c.citizen.phone}</span>
                        </>
                      )}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] text-slate-400">
                    {c.area || "Area not specified"} • {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Description */}
          {masterProblem.description && (
            <Card className="p-5">
              <div className="text-sm font-semibold text-slate-700">Problem Summary</div>
              <p className="mt-2 text-sm text-slate-700">{masterProblem.description}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Assigned Employee */}
          {assignedEmployee && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="text-sm font-semibold text-blue-800">Assigned Employee</div>
              <div className="mt-2 space-y-1 text-sm">
                <div><span className="text-slate-500">Name:</span> {assignedEmployee.name}</div>
                <div><span className="text-slate-500">Email:</span> {assignedEmployee.email}</div>
                {assignedEmployee.designation && <div><span className="text-slate-500">Role:</span> {assignedEmployee.designation}</div>}
                {assignedEmployee.phone && <div><span className="text-slate-500">Phone:</span> {assignedEmployee.phone}</div>}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-700">Actions</div>
            <div className="mt-3 flex flex-col gap-2">
              {masterProblem.status === "OPEN" && (
                <Button onClick={() => setShowAssign(true)}>
                  Assign Employee
                </Button>
              )}
              {masterProblem.status === "IN_PROGRESS" && !assignedEmployee && (
                <Button onClick={() => setShowAssign(true)}>
                  Assign Employee
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900">Assign Employee to Master Problem</h2>
            <p className="mt-1 text-sm text-slate-500">
              This will assign one employee to handle all {masterProblem.complaint_count} complaints together.
            </p>
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
