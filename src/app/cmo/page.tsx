"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import { MapPin, Users, AlertTriangle, CheckCircle, Clock, TrendingUp, Megaphone, Send, X, UserCheck, Building2 } from "lucide-react";

export default function CmoDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcValidUntil, setBcValidUntil] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    type: "status" | "officers" | "employees";
    level: "districts" | "complaints" | "list";
    statusFilter?: string;
    districtId?: string;
    breadcrumb: { label: string; onClick: () => void }[];
  } | null>(null);
  const [drillComplaints, setDrillComplaints] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [officersList, setOfficersList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/cmo/analytics")
      .then(r => r.ok ? r.json() : Promise.reject(new Error("API error")))
      .then(d => { if (d.kpis) { setAnalytics(d); } setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/broadcasts").then(r => r.ok ? r.json() : Promise.resolve({ broadcasts: [] })).then(d => setBroadcasts(d.broadcasts ?? [])).catch(() => {});
    fetch("/api/districts").then(r => r.ok ? r.json() : Promise.resolve({ districts: [] })).then(d => setDistricts(Array.isArray(d.districts) ? d.districts : [])).catch(() => {});
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  if (!analytics) {
    return <div className="p-6 text-center text-red-600">Failed to load analytics</div>;
  }

  const { department, kpis, statusBreakdown, districtStats } = analytics || {};
  const safeKpis = kpis || { totalComplaints: 0, resolutionRate: 0, districtsCovered: 0, totalDistricts: 0, overdue: 0, totalOfficers: 0, totalEmployees: 0, totalResolved: 0 };
  const safeStatusBreakdown = statusBreakdown || { PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, MARKED_RESOLVED: 0, RESOLVED: 0, OFFICER_REVIEW: 0 };
  const safeDistrictStats = districtStats || [];

  const receivedFromCm = broadcasts.filter(b => b.sender_role === "CM");
  const sentByMe = broadcasts.filter(b => b.sender_id !== "" && b.sender_role === "CMO");

  async function sendBroadcast() {
    if (!bcTitle || !bcMessage || selectedDistricts.length === 0) return;
    setBcSending(true);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bcTitle,
          message: bcMessage,
          targetLevel: "DISTRICT",
          targetIds: selectedDistricts,
          validUntil: bcValidUntil || null,
        }),
      });
      if (res.ok) {
        setShowBroadcast(false);
        setBcTitle(""); setBcMessage(""); setSelectedDistricts([]); setBcValidUntil("");
        fetch("/api/broadcasts").then(r => r.json()).then(d => setBroadcasts(d.broadcasts ?? [])).catch(() => {});
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to send order. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    }
    setBcSending(false);
  }

  // ===== DRILL-DOWN FUNCTIONS =====

  function closeDrillDown() {
    setDrillDown(null);
    setDrillComplaints([]);
    setOfficersList([]);
    setEmployeesList([]);
  }

  async function openStatusDrillDown(status: string, title: string) {
    setDrillDown({
      type: "status",
      level: "districts",
      statusFilter: status,
      breadcrumb: [{ label: title, onClick: () => closeDrillDown() }],
    });
  }

  async function openDistrictComplaints(ds: any) {
    setDrillLoading(true);
    const prevDrillDown = drillDown;
    try {
      const res = await fetch("/api/complaints");
      if (res.ok) {
        const d = await res.json();
        const all = d.complaints ?? [];
        let filtered = all.filter((c: any) => c.district_id === ds.district.id);
        const status = drillDown?.statusFilter;
        if (status === "PENDING") filtered = filtered.filter((c: any) => c.status === "PENDING" || c.status === "ASSIGNED");
        else if (status === "IN_PROGRESS") filtered = filtered.filter((c: any) => c.status === "IN_PROGRESS");
        else if (status === "RESOLVED") filtered = filtered.filter((c: any) => c.status === "RESOLVED" || c.status === "MARKED_RESOLVED");
        else if (status === "OVERDUE") {
          const now = new Date().toISOString();
          filtered = filtered.filter((c: any) => c.deadline && c.deadline < now && c.status !== "RESOLVED");
        }
        setDrillComplaints(filtered);
      }
    } catch {}
    setDrillLoading(false);
    setDrillDown(prev => prev ? {
      ...prev,
      level: "complaints",
      districtId: ds.district.id,
      breadcrumb: [
        ...prev.breadcrumb,
        { label: ds.district.name, onClick: () => setDrillDown(prevDrillDown ? { ...prevDrillDown, districtId: undefined } : null) },
      ],
    } : null);
  }

  async function openOfficersList() {
    setDrillLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const d = await res.json();
        const all = d.employees ?? [];
        const officers = all.filter((e: any) => e.role === "DEPARTMENT_OFFICER");
        setOfficersList(officers);
      }
    } catch {}
    setDrillLoading(false);
    setDrillDown({
      type: "officers",
      level: "list",
      breadcrumb: [{ label: "Officers", onClick: () => closeDrillDown() }],
    });
  }

  async function openEmployeesList() {
    setDrillLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const d = await res.json();
        const all = d.employees ?? [];
        const employees = all.filter((e: any) => e.role === "EMPLOYEE");
        setEmployeesList(employees);
      }
    } catch {}
    setDrillLoading(false);
    setDrillDown({
      type: "employees",
      level: "list",
      breadcrumb: [{ label: "Employees", onClick: () => closeDrillDown() }],
    });
  }

  function openReceipt(complaintId: string) {
    window.location.href = `/cmo/complaints/${complaintId}`;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
            {department?.name ?? "Department"} — CMO
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Overview of all districts and complaint management
          </p>
        </div>
        <Button onClick={() => setShowBroadcast(true)} className="flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto">
          <Megaphone size={16} /> <span className="hidden sm:inline">Send Order to Districts</span><span className="sm:hidden">Send Order</span>
        </Button>
      </div>

      {/* Received Orders from CM */}
      {receivedFromCm.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Megaphone size={16} className="text-red-600" />
            <div className="text-sm font-semibold text-slate-700">Orders from Chief Minister</div>
          </div>
          <div className="flex flex-col gap-2">
            {receivedFromCm.map((b: any) => (
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

      {/* My Sent Broadcasts */}
      {sentByMe.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Megaphone size={16} className="text-indigo-600" />
            <div className="text-sm font-semibold text-slate-700">Orders Sent to Districts</div>
          </div>
          <div className="flex flex-col gap-2">
            {sentByMe.slice(0, 5).map((b: any) => (
              <div key={b.id} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-900">{b.title}</span>
                  <span className="text-[10px] text-slate-500">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{b.message}</p>
                {b.valid_until && <div className="mt-1 text-[10px] text-amber-600">Valid until: {new Date(b.valid_until).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("TOTAL", "All Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-blue-100 p-1.5 sm:p-2"><TrendingUp size={18} className="text-blue-600" /></div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{safeKpis.totalComplaints}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Total Complaints</div>
              </div>
            </div>
          </Card>
        </div>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-green-100 p-1.5 sm:p-2"><CheckCircle size={18} className="text-green-600" /></div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">{safeKpis.resolutionRate}%</div>
              <div className="text-[10px] sm:text-xs font-medium text-slate-500">Resolution Rate</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-purple-100 p-1.5 sm:p-2"><MapPin size={18} className="text-purple-600" /></div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{safeKpis.districtsCovered}/{safeKpis.totalDistricts}</div>
              <div className="text-[10px] sm:text-xs font-medium text-slate-500">Districts Covered</div>
            </div>
          </div>
        </Card>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("OVERDUE", "Overdue Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-red-100 p-1.5 sm:p-2"><AlertTriangle size={18} className="text-red-600" /></div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-red-600">{safeKpis.overdue}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Overdue</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("PENDING", "Pending Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-amber-100 p-1.5 sm:p-2"><Clock size={18} className="text-amber-600" /></div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-amber-600">{safeStatusBreakdown.PENDING}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Pending</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={openOfficersList}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-indigo-100 p-1.5 sm:p-2"><Users size={18} className="text-indigo-600" /></div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{safeKpis.totalOfficers}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Officers</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={openEmployeesList}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-cyan-100 p-1.5 sm:p-2"><Users size={18} className="text-cyan-600" /></div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{safeKpis.totalEmployees}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Employees</div>
              </div>
            </div>
          </Card>
        </div>
        <div className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openStatusDrillDown("RESOLVED", "Resolved Complaints")}>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-emerald-100 p-1.5 sm:p-2"><CheckCircle size={18} className="text-emerald-600" /></div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">{safeKpis.totalResolved}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-500">Resolved</div>
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

          {drillLoading ? (
            <div className="py-8 text-center text-slate-400">Loading...</div>
          ) : drillDown.level === "districts" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {safeDistrictStats.map((ds: any) => {
                const count = drillDown.statusFilter === "TOTAL" ? ds.totalComplaints
                  : drillDown.statusFilter === "PENDING" ? ds.pending
                  : drillDown.statusFilter === "OVERDUE" ? (ds.totalComplaints - ds.resolved - (ds.pending || 0))
                  : drillDown.statusFilter === "RESOLVED" ? ds.resolved
                  : 0;
                if (count <= 0 && drillDown.statusFilter !== "TOTAL") return null;
                return (
                  <button key={ds.district.id} onClick={() => openDistrictComplaints(ds)}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-400 hover:shadow-md transition-all">
                    <MapPin size={24} className="text-brand-600" />
                    <span className="text-sm font-semibold text-slate-800 text-center truncate w-full">{ds.district.name}</span>
                    <span className="text-lg font-bold text-brand-700">{count}</span>
                    <span className="text-[10px] text-slate-500">complaints</span>
                  </button>
                );
              })}
            </div>
          ) : drillDown.level === "complaints" ? (
            <div className="space-y-2">
              {drillComplaints.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No complaints found</div>
              ) : (
                drillComplaints.map((c: any) => (
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
          ) : drillDown.level === "list" ? (
            drillDown.type === "officers" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {officersList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 col-span-full">No officers found</div>
                ) : officersList.map((o: any) => (
                  <div key={o.id} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <UserCheck size={24} className="text-indigo-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 text-center">{o.name}</span>
                    <span className="text-xs text-slate-500">{o.designation ?? "Officer"}</span>
                    <span className="text-xs text-slate-400">{o.email}</span>
                    {o.phone && <span className="text-xs text-slate-400">{o.phone}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {employeesList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 col-span-full">No employees found</div>
                ) : employeesList.map((e: any) => (
                  <div key={e.id} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                      <Users size={24} className="text-cyan-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 text-center">{e.name}</span>
                    <span className="text-xs text-slate-500">{e.designation ?? "Employee"}</span>
                    <span className="text-xs text-slate-400">{e.email}</span>
                    {e.phone && <span className="text-xs text-slate-400">{e.phone}</span>}
                  </div>
                ))}
              </div>
            )
          ) : null}
        </Card>
      )}

      {/* District Coverage */}
      <div className="mt-8">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">District Coverage</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {safeDistrictStats.map((ds: any) => (
            <Card key={ds.district.id} className={`p-4 ${!ds.hasOfficer ? "border-red-200 bg-red-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className={ds.hasOfficer ? "text-green-600" : "text-red-500"} />
                  <span className="font-medium text-slate-900">{ds.district.name}</span>
                </div>
                {!ds.hasOfficer && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    No Officer
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">Complaints:</span> <span className="font-medium">{ds.totalComplaints}</span></div>
                <div><span className="text-slate-500">Pending:</span> <span className="font-medium text-amber-600">{ds.pending}</span></div>
                <div><span className="text-slate-500">Resolved:</span> <span className="font-medium text-emerald-600">{ds.resolved}</span></div>
                <div><span className="text-slate-500">Officers:</span> <span className="font-medium">{ds.officerCount}</span></div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="mt-8">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">Status Breakdown</h2>
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            {Object.entries(safeStatusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  status === "PENDING" ? "bg-amber-500" :
                  status === "ASSIGNED" ? "bg-blue-500" :
                  status === "IN_PROGRESS" ? "bg-indigo-500" :
                  status === "MARKED_RESOLVED" ? "bg-orange-500" :
                  status === "RESOLVED" ? "bg-emerald-500" :
                  "bg-red-500"
                }`} />
                <span className="text-sm text-slate-600">{status.replace(/_/g, " ")}:</span>
                <span className="font-semibold text-slate-900">{count as number}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="mx-2 sm:mx-0 w-full max-w-lg p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Megaphone size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Send Order to Districts</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Select one or multiple districts for this announcement</p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Select Districts</label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {districts.map((d: any) => (
                    <label key={d.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" value={d.id}
                        checked={selectedDistricts.includes(d.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedDistricts([...selectedDistricts, d.id]);
                          else setSelectedDistricts(selectedDistricts.filter(id => id !== d.id));
                        }}
                        className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">{d.name}</span>
                    </label>
                  ))}
                  {districts.length === 0 && <div className="py-2 text-center text-xs text-slate-400">No districts available</div>}
                </div>
                {selectedDistricts.length > 0 && (
                  <div className="mt-1 text-xs text-indigo-600">{selectedDistricts.length} district(s) selected</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Title / Subject</label>
                <input type="text" value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="e.g., Gas unavailable for 5 hours tomorrow"
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
              <Button className="flex-1 flex items-center justify-center gap-2" disabled={bcSending || !bcTitle || !bcMessage || selectedDistricts.length === 0} onClick={sendBroadcast}>
                <Send size={14} /> {bcSending ? "Sending…" : "Send Order"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
