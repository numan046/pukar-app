"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { Users, AlertTriangle, Clock, CheckCircle2, FolderKanban, Megaphone, Send, X, UserCheck } from "lucide-react";
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

  // Complaint list modal state
  const [showComplaintList, setShowComplaintList] = useState(false);
  const [filteredComplaints, setFilteredComplaints] = useState<any[]>([]);
  const [listTitle, setListTitle] = useState("");

  // Receipt modal state
  const [receiptComplaint, setReceiptComplaint] = useState<any>(null);
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string } | null>(null);

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    type: "status" | "employees";
    level: "complaints" | "list";
    statusFilter?: string;
    breadcrumb: { label: string; onClick: () => void }[];
  } | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

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

  function openComplaintList(filter: string, title: string) {
    let filtered: any[] = [];
    const allComplaints = [...standaloneComplaints];
    if (filter === "TOTAL") {
      filtered = allComplaints;
    } else if (filter === "PENDING") {
      filtered = allComplaints.filter(c => c.status === "PENDING" || c.status === "ASSIGNED");
    } else if (filter === "IN_PROGRESS") {
      filtered = allComplaints.filter(c => c.status === "IN_PROGRESS");
    } else if (filter === "RESOLVED") {
      filtered = allComplaints.filter(c => c.status === "RESOLVED" || c.status === "MARKED_RESOLVED");
    } else if (filter === "OVERDUE") {
      const now = new Date().toISOString();
      filtered = allComplaints.filter(c => c.deadline && c.deadline < now && c.status !== "RESOLVED");
    }
    setFilteredComplaints(filtered);
    setListTitle(title);
    setShowComplaintList(true);
  }

  async function openReceipt(complaintId: string) {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`);
      if (res.ok) {
        const data = await res.json();
        setReceiptComplaint(data);
        setShowComplaintList(false);
        setDrillDown(null);
      }
    } catch {}
  }

  // ===== DRILL-DOWN FUNCTIONS =====

  function closeDrillDown() {
    setDrillDown(null);
    setFilteredComplaints([]);
  }

  function openStatusDrillDown(filter: string, title: string) {
    let filtered: any[] = [];
    const allComplaints = [...standaloneComplaints];
    if (filter === "TOTAL") filtered = allComplaints;
    else if (filter === "PENDING") filtered = allComplaints.filter(c => c.status === "PENDING" || c.status === "ASSIGNED");
    else if (filter === "IN_PROGRESS") filtered = allComplaints.filter(c => c.status === "IN_PROGRESS");
    else if (filter === "RESOLVED") filtered = allComplaints.filter(c => c.status === "RESOLVED" || c.status === "MARKED_RESOLVED");
    else if (filter === "OVERDUE") {
      const now = new Date().toISOString();
      filtered = allComplaints.filter(c => c.deadline && c.deadline < now && c.status !== "RESOLVED");
    }
    setFilteredComplaints(filtered);
    setDrillDown({
      type: "status",
      level: "complaints",
      statusFilter: filter,
      breadcrumb: [{ label: title, onClick: () => closeDrillDown() }],
    });
  }

  function openEmployeesDrillDown() {
    setDrillDown({
      type: "employees",
      level: "list",
      breadcrumb: [{ label: "Employees", onClick: () => closeDrillDown() }],
    });
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
          <Button onClick={() => setShowBroadcast(true)} className="flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto">
            <Megaphone size={16} /> Announce
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
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("TOTAL", "All Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <FolderKanban size={18} className="text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.standaloneComplaints}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Total Complaints</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("PENDING", "Pending Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-amber-600">{standaloneComplaints.filter(c => c.status === "PENDING" || c.status === "ASSIGNED").length}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Pending</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("IN_PROGRESS", "In Progress Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{standaloneComplaints.filter(c => c.status === "IN_PROGRESS").length}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">In Progress</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("RESOLVED", "Resolved Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">{standaloneComplaints.filter(c => c.status === "RESOLVED" || c.status === "MARKED_RESOLVED").length}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Resolved</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("OVERDUE", "Overdue Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-red-600">{standaloneComplaints.filter(c => c.deadline && c.deadline < new Date().toISOString() && c.status !== "RESOLVED").length}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Overdue</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={openEmployeesDrillDown}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-cyan-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-slate-700">{stats.employees}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Employees</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Drill-Down Panel */}
      {drillDown && (
        <Card className="mt-4 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {drillDown.breadcrumb.map((crumb, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-400">/</span>}
                <button onClick={crumb.onClick} className="text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline">
                  {crumb.label}
                </button>
              </div>
            ))}
            <button onClick={closeDrillDown} className="ml-auto text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {drillDown.level === "complaints" ? (
            <div className="space-y-2">
              {filteredComplaints.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No complaints found</div>
              ) : (
                filteredComplaints.map((c: any) => (
                  <div key={c.id} onClick={() => openReceipt(c.id)} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] sm:text-xs text-slate-500">{c.complaint_code}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-medium ${
                          c.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                          c.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                          c.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                          c.status === "OFFICER_REVIEW" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>{c.status.replace(/_/g, " ")}</span>
                      </div>
                      <div className="mt-1 text-xs sm:text-sm font-medium text-slate-800 truncate">{c.title || c.description?.slice(0, 60) || "No title"}</div>
                      <div className="mt-0.5 text-[10px] sm:text-xs text-slate-500 truncate">{c.category ?? "Uncategorized"} — {c.area ?? "Unknown area"}</div>
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-400 shrink-0">{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          ) : drillDown.level === "list" && drillDown.type === "employees" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {employees.length === 0 ? (
                <div className="py-8 text-center text-slate-400 col-span-full">No employees found</div>
              ) : employees.map((e: any) => (
                <div key={e.id} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                    <UserCheck size={24} className="text-cyan-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 text-center">{e.name}</span>
                  <span className="text-xs text-slate-500">{e.designation ?? "Employee"}</span>
                  <span className="text-xs text-slate-400">{e.email}</span>
                  {e.phone && <span className="text-xs text-slate-400">{e.phone}</span>}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      )}

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

      {/* Complaint List Modal */}
      {showComplaintList && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setShowComplaintList(false)}>
          <div className="relative w-full sm:max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-xl sm:rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-5 py-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{listTitle}</h2>
              <button onClick={() => setShowComplaintList(false)} className="rounded-lg p-1.5 hover:bg-slate-100 shrink-0">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
              {filteredComplaints.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No complaints found</div>
              ) : (
                <div className="space-y-2">
                  {filteredComplaints.map((c: any) => (
                    <div key={c.id} onClick={() => openReceipt(c.id)} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] sm:text-xs text-slate-500">{c.complaint_code}</span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-medium ${
                            c.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
                            c.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                            c.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                            c.status === "OFFICER_REVIEW" ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>{c.status.replace(/_/g, " ")}</span>
                        </div>
                        <div className="mt-1 text-xs sm:text-sm font-medium text-slate-800 truncate">{c.title || c.description?.slice(0, 60) || "No title"}</div>
                        <div className="mt-0.5 text-[10px] sm:text-xs text-slate-500 truncate">{c.category ?? "Uncategorized"} — {c.area ?? "Unknown area"}</div>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 shrink-0">{new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptComplaint && (() => {
        const c = receiptComplaint.complaint;
        const STATUS_FLOW = ["PENDING", "ASSIGNED", "IN_PROGRESS", "MARKED_RESOLVED", "RESOLVED"];
        const reachedIdx = STATUS_FLOW.indexOf(c.status);
        const isReview = c.status === "OFFICER_REVIEW";
        const daysSince = Math.ceil((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const daysToDeadline = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        const mediaUrls: string[] = JSON.parse(c.media_urls || "[]");
        let resolutionProof: string[] = [];
        try { if (c.resolution_proof && c.resolution_proof !== "[]" && c.resolution_proof !== "null") resolutionProof = JSON.parse(c.resolution_proof); } catch {}
        const updates = receiptComplaint.updates || [];
        const history = receiptComplaint.history || [];
        return (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setReceiptComplaint(null)}>
            <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between rounded-t-xl">
                <div className="min-w-0 flex-1 mr-2">
                  <div className="font-mono text-[10px] sm:text-xs text-slate-400 truncate">{c.complaint_code}</div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{c.title || c.category || "Complaint"}</h3>
                </div>
                <button onClick={() => setReceiptComplaint(null)} className="rounded-lg p-1.5 hover:bg-slate-100 shrink-0">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
                {/* Status flow */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">PROGRESS</div>
                  <div className="flex items-center gap-1">
                    {STATUS_FLOW.map((s, idx) => {
                      const reached = idx <= reachedIdx || isReview;
                      return (
                        <div key={s} className="flex flex-1 flex-col items-center">
                          <div className={`h-1.5 w-full rounded-full ${reached ? "bg-brand-600" : "bg-slate-200"}`} />
                          <span className={`mt-1 text-[8px] font-medium text-center ${reached ? "text-brand-700" : "text-slate-400"}`}>
                            {s === "MARKED_RESOLVED" ? "Verify" : s.replace("_", " ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      c.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                      c.status === "ASSIGNED" ? "bg-orange-100 text-orange-800" :
                      c.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                      c.status === "MARKED_RESOLVED" ? "bg-cyan-100 text-cyan-800" :
                      c.status === "RESOLVED" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>{c.status.replace(/_/g, " ")}</span>
                  </div>
                </div>

                {/* Description */}
                {c.description && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">DESCRIPTION</div>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{c.description}</p>
                  </div>
                )}

                {/* All Media */}
                {(() => {
                  const allMedia: { section: string; urls: string[] }[] = [];
                  if (mediaUrls.length > 0) allMedia.push({ section: "INITIAL COMPLAINT", urls: mediaUrls });
                  for (const u of updates) {
                    let proofUrls: string[] = [];
                    try { if (u.proof_data && u.proof_data !== "[]" && u.proof_data !== "null") proofUrls = JSON.parse(u.proof_data); } catch {}
                    if (proofUrls.length > 0) allMedia.push({ section: `${u.update_type} UPDATE — ${new Date(u.created_at).toLocaleDateString()}`, urls: proofUrls });
                  }
                  if (resolutionProof.length > 0) allMedia.push({ section: "RESOLUTION PROOF", urls: resolutionProof });
                  if (allMedia.length === 0) return null;
                  return allMedia.map((group, gi) => (
                    <div key={gi}>
                      <div className="text-xs font-semibold text-slate-500 mb-2">{group.section}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {group.urls.map((url: string, i: number) => {
                          const isDataImage = /^data:image\//i.test(url);
                          const isDataVideo = /^data:video\//i.test(url);
                          const isImage = isDataImage || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
                          const isVideo = isDataVideo || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
                          const mediaType = isImage ? "image" : isVideo ? "video" : "file";
                          return (
                            <button key={i} onClick={() => setMediaViewer({ url, type: mediaType })} className="block rounded-lg overflow-hidden border border-slate-200 hover:border-brand-400 transition-colors group cursor-pointer">
                              {isImage ? (
                                <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                              ) : isVideo ? (
                                <div className="relative w-full h-20 bg-slate-900 flex items-center justify-center">
                                  <video src={url} className="w-full h-full object-cover" muted />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                                      <svg className="w-3.5 h-3.5 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-20 bg-slate-100 flex items-center justify-center">
                                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}

                {/* Location & Department */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">AREA</div>
                    <div className="text-sm text-slate-700">{c.area ?? "Unknown"}, {receiptComplaint.district?.name ?? "Unknown"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">DEPARTMENT</div>
                    <div className="text-sm text-slate-700">{receiptComplaint.department?.name ?? c.category ?? "Uncategorized"}</div>
                  </div>
                </div>

                {/* Citizen & Employee */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">CITIZEN</div>
                    <div className="text-sm font-medium text-slate-800">{receiptComplaint.citizen?.name ?? "Unknown"}</div>
                    {receiptComplaint.citizen?.phone && <div className="text-xs text-emerald-600 font-medium"> {receiptComplaint.citizen.phone}</div>}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">ASSIGNED EMPLOYEE</div>
                    {receiptComplaint.assignedEmployee ? (
                      <>
                        <div className="text-sm font-medium text-slate-800">{receiptComplaint.assignedEmployee.name}</div>
                        {receiptComplaint.assignedEmployee.designation && <div className="text-xs text-slate-500">{receiptComplaint.assignedEmployee.designation}</div>}
                      </>
                    ) : (
                      <div className="text-sm text-slate-400">Not assigned</div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">FILED</div>
                    <div className="text-sm text-slate-700">{new Date(c.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{daysSince} days ago</div>
                  </div>
                  {c.deadline && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">DEADLINE</div>
                      <div className={`text-sm font-medium ${daysToDeadline !== null && daysToDeadline < 0 ? "text-red-600" : "text-slate-700"}`}>
                        {new Date(c.deadline).toLocaleDateString()}
                      </div>
                      {daysToDeadline !== null && <div className={`text-xs ${daysToDeadline < 0 ? "text-red-500" : "text-slate-400"}`}>{daysToDeadline < 0 ? `${Math.abs(daysToDeadline)} days overdue` : `${daysToDeadline} days left`}</div>}
                    </div>
                  )}
                </div>

                {/* History timeline */}
                {history.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">ACTIVITY TIMELINE</div>
                    <div className="space-y-2">
                      {history.map((h: any, i: number) => (
                        <div key={i} className="flex gap-2">
                          <div className="flex flex-col items-center">
                            <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5" />
                            {i < history.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="text-xs font-medium text-slate-700">{h.action.replace(/_/g, " ")}</div>
                            {h.description && <div className="text-[11px] text-slate-500">{h.description}</div>}
                            <div className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Media Viewer Modal */}
      {mediaViewer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setMediaViewer(null)}>
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <span className="text-sm font-medium text-slate-700 capitalize">{mediaViewer.type} Viewer</span>
              <button onClick={() => setMediaViewer(null)} className="rounded-lg p-1 hover:bg-slate-100">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto">
              {mediaViewer.type === "image" ? (
                <img src={mediaViewer.url} alt="Full view" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              ) : mediaViewer.type === "video" ? (
                <video src={mediaViewer.url} controls autoPlay className="max-w-full max-h-[70vh] rounded-lg" />
              ) : (
                <a href={mediaViewer.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline text-sm">Open file in new tab</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
