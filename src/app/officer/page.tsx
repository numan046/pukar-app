"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { Users, AlertTriangle, Clock, CheckCircle2, FolderKanban, Megaphone, Send } from "lucide-react";
import type { SessionUser, MasterProblemRow } from "@/types";

export default function OfficerDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [masterProblems, setMasterProblems] = useState<MasterProblemRow[]>([]);
  const [standaloneComplaints, setStandaloneComplaints] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [deptName, setDeptName] = useState("");
  const [districtName, setDistrictName] = useState("");

  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcValidUntil, setBcValidUntil] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setUser(d.user);
      if (d.user?.departmentId) {
        fetch("/api/departments").then((r) => r.json()).then((dd) => {
          const dept = dd.departments?.find((x: any) => x.id === d.user.departmentId);
          if (dept) setDeptName(dept.name);
        });
      }
      if (d.user?.districtId) {
        fetch("/api/districts").then((r) => r.json()).then((dd) => {
          const district = dd.districts?.find((x: any) => x.id === d.user.districtId);
          if (district) setDistrictName(district.name);
        }).catch(() => {});
      }
    });
    fetch("/api/master-problems").then((r) => r.json()).then((d) => setMasterProblems(d.masterProblems ?? []));
    fetch("/api/complaints").then((r) => r.json()).then((d) => {
      // Show only standalone complaints (not linked to master problems)
      const standalone = (d.complaints ?? []).filter((c: any) => !c.master_problem_id);
      setStandaloneComplaints(standalone);
    });
    fetch("/api/employees").then((r) => r.json()).then((d) => setEmployees(d.employees ?? []));
    // Load broadcasts
    fetch("/api/broadcasts").then(r => r.json()).then(d => setBroadcasts(d.broadcasts ?? []));
  }, []);

  const stats = useMemo(() => {
    const now = new Date().toISOString();
    return {
      totalMasterProblems: masterProblems.length,
      openProblems: masterProblems.filter((mp) => mp.status === "OPEN").length,
      inProgressProblems: masterProblems.filter((mp) => mp.status === "IN_PROGRESS").length,
      resolvedProblems: masterProblems.filter((mp) => mp.status === "RESOLVED").length,
      totalCitizensAffected: masterProblems.reduce((sum, mp) => sum + mp.complaint_count, 0),
      overdueProblems: masterProblems.filter((mp) => mp.deadline && mp.deadline < now && mp.status !== "RESOLVED").length,
      standaloneComplaints: standaloneComplaints.length,
      employees: employees.length,
    };
  }, [masterProblems, standaloneComplaints, employees]);

  if (!user) return null;

  const priorityColor = (p: string) => {
    switch (p) {
      case "P0": return "bg-red-100 text-red-700 border-red-200";
      case "P1": return "bg-orange-100 text-orange-700 border-orange-200";
      case "P2": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-green-100 text-green-700 border-green-200";
    }
  };

  // Separate CM orders and own broadcasts
  const cmOrders = broadcasts.filter(b => b.sender_role === "CM");
  const myBroadcasts = broadcasts.filter(b => b.sender_role === "DEPARTMENT_OFFICER");

  async function sendBroadcast() {
    if (!bcTitle || !bcMessage || !user?.districtId) return;
    setBcSending(true);
    const res = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: bcTitle,
        message: bcMessage,
        targetLevel: "CITIZENS",
        targetIds: [user.districtId],
        validUntil: bcValidUntil || null,
      }),
    });
    if (res.ok) {
      setShowBroadcast(false);
      setBcTitle(""); setBcMessage(""); setBcValidUntil("");
      fetch("/api/broadcasts").then(r => r.json()).then(d => setBroadcasts(d.broadcasts ?? []));
    }
    setBcSending(false);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
            {deptName || "Department"}{districtName ? ` — ${districtName}` : ""} — Officer
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage problems and complaints{districtName ? ` in ${districtName}` : ""}
          </p>
        </div>
        {user.districtId && (
          <Button onClick={() => setShowBroadcast(true)} className="flex items-center gap-2 whitespace-nowrap">
            <Megaphone size={16} /> <span className="hidden sm:inline">Announce</span><span className="sm:hidden">Announce</span>
          </Button>
        )}
      </div>

      {/* CM Orders */}
      {cmOrders.length > 0 && (
        <Card className="mt-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Megaphone size={16} className="text-red-600" />
            <div className="text-sm font-semibold text-slate-700">Orders from Chief Minister</div>
          </div>
          <div className="flex flex-col gap-2">
            {cmOrders.map((b: any) => (
              <div key={b.id} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-900">{b.title}</span>
                  <span className="text-[10px] text-slate-500">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{b.message}</p>
                {b.valid_until && <div className="mt-1 text-[10px] text-amber-600">Valid until: {new Date(b.valid_until).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My Sent Announcements */}
      {myBroadcasts.length > 0 && (
        <Card className="mt-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Megaphone size={16} className="text-indigo-600" />
            <div className="text-sm font-semibold text-slate-700">Announcements Sent</div>
          </div>
          <div className="flex flex-col gap-2">
            {myBroadcasts.slice(0, 5).map((b: any) => (
              <div key={b.id} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-900">{b.title}</span>
                  <span className="text-[10px] text-slate-500">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{b.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FolderKanban size={20} className="text-indigo-600" />
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalMasterProblems}</div>
              <div className="text-xs font-medium text-slate-500">Master Problems</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalCitizensAffected}</div>
              <div className="text-xs font-medium text-slate-500">Citizens Affected</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-600" />
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats.openProblems}</div>
              <div className="text-xs font-medium text-slate-500">Open Problems</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgressProblems}</div>
              <div className="text-xs font-medium text-slate-500">In Progress</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <div>
              <div className="text-2xl font-bold text-emerald-600">{stats.resolvedProblems}</div>
              <div className="text-xs font-medium text-slate-500">Resolved</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.overdueProblems}</div>
              <div className="text-xs font-medium text-slate-500">Overdue</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FolderKanban size={20} className="text-slate-600" />
            <div>
              <div className="text-2xl font-bold text-slate-700">{stats.standaloneComplaints}</div>
              <div className="text-xs font-medium text-slate-500">Individual Complaints</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-cyan-600" />
            <div>
              <div className="text-2xl font-bold text-slate-700">{stats.employees}</div>
              <div className="text-xs font-medium text-slate-500">Employees</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Master Problems Section */}
      {masterProblems.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <FolderKanban size={20} className="text-indigo-600" />
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Master Problems</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Multiple citizens reporting the same issue are automatically grouped into one problem</p>
          <div className="mt-3 overflow-x-auto">
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
                {masterProblems.slice(0, 10).map((mp) => (
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
                      <Link href={`/officer/master-problems/${mp.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standalone Complaints Section */}
      <div className="mt-8">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">Individual Complaints</h2>
        <p className="mt-1 text-xs text-slate-500">Complaints not grouped — sorted by AI priority</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="pb-2 pr-4">Priority</th>
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Deadline</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {standaloneComplaints.slice(0, 10).map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/officer/complaints/${c.id}`}>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${priorityColor(c.priority || "P2")}`}>
                      {c.priority || "P2"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{c.complaint_code}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{c.category ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                      c.status === "OFFICER_REVIEW" ? "bg-red-100 text-red-700" :
                      c.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>{c.status}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-slate-500">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</td>
                  <td className="py-2.5 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {standaloneComplaints.length === 0 && masterProblems.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">No complaints yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="mx-2 sm:mx-0 w-full max-w-lg p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Megaphone size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Announce to Citizens — {districtName}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">This will notify all citizens who filed complaints in {districtName} district</p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Title / Subject</label>
                <input type="text" value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="e.g., Gas supply interrupted for 5 hours"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Detailed Message</label>
                <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} rows={3} placeholder="Provide details about the announcement..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Valid Until (expiry)</label>
                <input type="datetime-local" value={bcValidUntil} onChange={e => setBcValidUntil(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowBroadcast(false)}>Cancel</Button>
              <Button className="flex-1 flex items-center justify-center gap-2" disabled={bcSending || !bcTitle || !bcMessage} onClick={sendBroadcast}>
                <Send size={14} /> {bcSending ? "Sending…" : "Send Announcement"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
