"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import dynamic from "next/dynamic";
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading map component…</div>,
});
import { PAKISTAN_BOUNDS } from "@/lib/pakistan-boundary";
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock, Users,
  Building2, PieChart as PieIcon, Activity, UserCheck, Megaphone, Send,
  MapPin, X,
} from "lucide-react";

interface AnalyticsData {
  kpis: Record<string, number>;
  statusDistribution: { name: string; value: number; color: string }[];
  deptStats: { id: string; name: string; total: number; resolved: number; inProgress: number; pending: number; overdue: number; employees: number; officerName: string }[];
  categoryDistribution: { name: string; count: number }[];
  dailyTrend: { date: string; submitted: number; resolved: number }[];
  employeeWorkload: { name: string; designation: string | null; total: number; active: number; done: number }[];
  verification: { verifiedYes: number; verifiedNo: number; pendingVerification: number };
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b", Assigned: "#3b82f6", "In Progress": "#8b5cf6",
  "Marked Resolved": "#06b6d4", Resolved: "#10b981", "Officer Review": "#ef4444",
};

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
      </div>
    </Card>
  );
}

function PieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="py-8 text-center text-sm text-slate-400">No data</div>;
  let cumulative = 0;
  const size = 160;
  const r = 60;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const start = cumulative / total;
          cumulative += d.value;
          const end = cumulative / total;
          const startAngle = start * 2 * Math.PI - Math.PI / 2;
          const endAngle = end * 2 * Math.PI - Math.PI / 2;
          const largeArc = d.value / total > 0.5 ? 1 : 0;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          if (data.length === 1) {
            return <circle key={i} cx={cx} cy={cy} r={r} fill={d.color} />;
          }
          return (
            <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={d.color} />
          );
        })}
        <circle cx={cx} cy={cy} r={30} fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="text-lg font-bold" fill="#1e293b" fontSize="18">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">TOTAL</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600">{d.name}</span>
            <span className="font-semibold text-slate-800">{d.value}</span>
            <span className="text-slate-400">({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  if (data.length === 0) return <div className="py-4 text-center text-sm text-slate-400">No data</div>;
  return (
    <div className="flex items-end gap-2" style={{ height: 140 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-700">{d.value}</span>
          <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(4, (d.value / Math.max(maxVal, 1)) * 110)}px`, backgroundColor: d.color, minWidth: 24 }} />
          <span className="text-[9px] text-slate-500 text-center leading-tight truncate w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data }: { data: { date: string; submitted: number; resolved: number }[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.submitted, d.resolved)), 1);
  const w = 400;
  const h = 120;
  const pad = 4;
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);

  function toPath(key: "submitted" | "resolved") {
    return data.map((d, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (d[key] / maxVal) * (h - 20);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  }

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 140 }}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e2e8f0" strokeWidth={1} />
        <path d={toPath("submitted")} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={toPath("resolved")} fill="none" stroke="#10b981" strokeWidth={2} />
        {data.map((d, i) => {
          const x = pad + i * stepX;
          const y1 = h - pad - (d.submitted / maxVal) * (h - 20);
          const y2 = h - pad - (d.resolved / maxVal) * (h - 20);
          return (
            <g key={i}>
              <circle cx={x} cy={y1} r={3} fill="#3b82f6" />
              <circle cx={x} cy={y2} r={3} fill="#10b981" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-slate-400 px-1">
        {data.filter((_, i) => i % 3 === 0).map(d => <span key={d.date}>{d.date.slice(5)}</span>)}
      </div>
      <div className="mt-2 flex gap-4 text-xs">
        <div className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-blue-500" /> Submitted</div>
        <div className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-emerald-500" /> Resolved</div>
      </div>
    </div>
  );
}

export default function CmDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [cmos, setCmos] = useState<any[]>([]);
  const [selectedCmos, setSelectedCmos] = useState<string[]>([]);
  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcValidUntil, setBcValidUntil] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [sentBroadcasts, setSentBroadcasts] = useState<any[]>([]);

  // Complaint map state
  const [showMap, setShowMap] = useState(false);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [checkedStatuses, setCheckedStatuses] = useState<Record<string, boolean>>({
    PENDING: true, ASSIGNED: true, IN_PROGRESS: true, MARKED_RESOLVED: true, RESOLVED: true, OFFICER_REVIEW: true,
  });
  const [receiptMarker, setReceiptMarker] = useState<any>(null);

  useEffect(() => {
    fetch("/api/cm/analytics").then(r => r.json()).then(setData).finally(() => setLoading(false));
    // Load CMOs and sent broadcasts
    fetch("/api/broadcasts").then(r => r.json()).then(d => setSentBroadcasts(d.broadcasts ?? []));
    // Fetch all CMOs for targeting
    fetch("/api/cmos").then(r => r.json()).then(d => setCmos(d.cmos ?? [])).catch(() => {});
  }, []);

  async function openComplaintMap() {
    setShowMap(true);
    setMapLoading(true);
    try {
      const r = await fetch("/api/cm/complaint-map");
      if (r.ok) {
        const d = await r.json();
        setMapMarkers(d.markers ?? []);
      }
    } catch {}
    setMapLoading(false);
  }

  // Global handler for popup click → open receipt
  useEffect(() => {
    if (!showMap) return;
    (window as any).__pukarOpenReceipt = (markerId: string) => {
      const marker = mapMarkers.find(m => m.id === markerId);
      if (marker) setReceiptMarker(marker);
    };
    return () => { delete (window as any).__pukarOpenReceipt; };
  }, [showMap, mapMarkers]);

  // Escape HTML to prevent XSS in Leaflet popups
  function escHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function toggleStatus(status: string) {
    setCheckedStatuses(prev => ({ ...prev, [status]: !prev[status] }));
  }

  function toggleAllStatuses(checked: boolean) {
    setCheckedStatuses({
      PENDING: checked, ASSIGNED: checked, IN_PROGRESS: checked,
      MARKED_RESOLVED: checked, RESOLVED: checked, OFFICER_REVIEW: checked,
    });
  }

  const allChecked = Object.values(checkedStatuses).every(Boolean);
  const filteredMarkers = mapMarkers.filter(m => checkedStatuses[m.status]);

  async function sendBroadcast() {
    if (!bcTitle || !bcMessage || selectedCmos.length === 0) return;
    setBcSending(true);
    const res = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: bcTitle,
        message: bcMessage,
        targetLevel: "CMO",
        targetIds: selectedCmos,
        validUntil: bcValidUntil || null,
      }),
    });
    if (res.ok) {
      setShowBroadcast(false);
      setBcTitle(""); setBcMessage(""); setSelectedCmos([]); setBcValidUntil("");
      // Refresh broadcasts
      fetch("/api/broadcasts").then(r => r.json()).then(d => setSentBroadcasts(d.broadcasts ?? []));
    }
    setBcSending(false);
  }

  if (loading || !data) return <div className="p-10 text-center text-slate-400">Loading analytics…</div>;

  const { kpis, statusDistribution, deptStats, categoryDistribution, dailyTrend, employeeWorkload, verification } = data;
  const maxDept = Math.max(...deptStats.map(d => d.total), 1);
  const maxEmp = Math.max(...employeeWorkload.map(e => e.total), 1);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Chief Minister — System Overview</h1>
          <p className="text-sm text-slate-500">Real-time analytics across all departments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openComplaintMap} className="flex items-center gap-2">
            <MapPin size={16} /> Complaint Map
          </Button>
          <Button onClick={() => setShowBroadcast(true)} className="flex items-center gap-2">
            <Megaphone size={16} /> Send Order to CMOs
          </Button>
        </div>
      </div>

      {/* Sent Broadcasts */}
      {sentBroadcasts.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Megaphone size={16} className="text-indigo-600" />
            <div className="text-sm font-semibold text-slate-700">Orders Sent to CMOs</div>
          </div>
          <div className="flex flex-col gap-2">
            {sentBroadcasts.slice(0, 5).map((b: any) => (
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

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={<BarChart3 size={20} className="text-blue-600" />} label="Total" value={kpis.totalComplaints} color="bg-blue-50" />
        <KpiCard icon={<Clock size={20} className="text-amber-600" />} label="Pending" value={kpis.pending} sub={`${kpis.assigned} assigned`} color="bg-amber-50" />
        <KpiCard icon={<Activity size={20} className="text-violet-600" />} label="In Progress" value={kpis.inProgress} color="bg-violet-50" />
        <KpiCard icon={<CheckCircle2 size={20} className="text-emerald-600" />} label="Resolved" value={kpis.resolved} sub={`${kpis.resolutionRate}% rate`} color="bg-emerald-50" />
        <KpiCard icon={<AlertTriangle size={20} className="text-red-600" />} label="Overdue" value={kpis.overdueCount} color="bg-red-50" />
        <KpiCard icon={<Users size={20} className="text-cyan-600" />} label="Employees" value={kpis.totalEmployees} sub={`${kpis.totalOfficers} officers`} color="bg-cyan-50" />
      </div>

      {/* Row 2: Pie + Department bars */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <PieIcon size={16} className="text-slate-500" />
            <div className="text-sm font-semibold text-slate-700">Complaint Status Distribution</div>
          </div>
          <PieChart data={statusDistribution} />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-slate-500" />
            <div className="text-sm font-semibold text-slate-700">Department-wise Complaints</div>
          </div>
          <BarChart
            data={deptStats.map(d => ({ label: d.name.replace(" & ", " &\n"), value: d.total, color: "#6366f1" }))}
            maxVal={maxDept}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {deptStats.map(d => (
              <div key={d.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <div className="font-semibold text-slate-700">{d.name}</div>
                <div className="text-slate-500">Officer: {d.officerName}</div>
                <div className="flex gap-2">
                  <span className="text-emerald-600">{d.resolved} resolved</span>
                  <span className="text-amber-600">{d.pending} pending</span>
                  {d.overdue > 0 && <span className="text-red-600">{d.overdue} overdue</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Trend + Categories */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-500" />
            <div className="text-sm font-semibold text-slate-700">14-Day Trend</div>
          </div>
          <TrendChart data={dailyTrend} />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-slate-500" />
            <div className="text-sm font-semibold text-slate-700">Category Breakdown</div>
          </div>
          <BarChart
            data={categoryDistribution.map(c => ({ label: c.name.length > 16 ? c.name.slice(0, 16) + "…" : c.name, value: c.count, color: "#8b5cf6" }))}
            maxVal={Math.max(...categoryDistribution.map(c => c.count), 1)}
          />
        </Card>
      </div>

      {/* Row 4: Employee workload + Verification */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <div className="text-sm font-semibold text-slate-700">Employee Workload</div>
          </div>
          {employeeWorkload.length > 0 ? (
            <div className="flex flex-col gap-2">
              {employeeWorkload.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-20 sm:w-28 truncate text-xs font-medium text-slate-700" title={e.name}>{e.name}</div>
                  <div className="flex h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    {e.done > 0 && <div className="bg-emerald-500" style={{ width: `${(e.done / maxEmp) * 100}%` }} title={`${e.done} done`} />}
                    {e.active > 0 && <div className="bg-amber-400" style={{ width: `${(e.active / maxEmp) * 100}%` }} title={`${e.active} active`} />}
                  </div>
                  <div className="w-16 text-right text-[10px] text-slate-500">{e.active} active / {e.done} done</div>
                </div>
              ))}
              <div className="mt-1 flex gap-3 text-[10px]">
                <div className="flex items-center gap-1"><div className="h-2 w-3 rounded bg-emerald-500" /> Done</div>
                <div className="flex items-center gap-1"><div className="h-2 w-3 rounded bg-amber-400" /> Active</div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-slate-400">No employee assignments yet</div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <UserCheck size={16} className="text-slate-500" />
            <div className="text-sm font-semibold text-slate-700">Citizen Verification</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{verification.verifiedYes}</div>
              <div className="text-xs text-emerald-600">Confirmed Solved</div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{verification.verifiedNo}</div>
              <div className="text-xs text-red-600">Disputed</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{verification.pendingVerification}</div>
              <div className="text-xs text-amber-600">Awaiting Verify</div>
            </div>
          </div>
          {(verification.verifiedYes + verification.verifiedNo) > 0 && (
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">Satisfaction Rate</div>
              <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-emerald-500" style={{ width: `${(verification.verifiedYes / (verification.verifiedYes + verification.verifiedNo)) * 100}%` }} />
                <div className="bg-red-400" style={{ width: `${(verification.verifiedNo / (verification.verifiedYes + verification.verifiedNo)) * 100}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>{Math.round((verification.verifiedYes / (verification.verifiedYes + verification.verifiedNo)) * 100)}% satisfied</span>
                <span>{Math.round((verification.verifiedNo / (verification.verifiedYes + verification.verifiedNo)) * 100)}% disputed</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Complaint Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
          <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-2xl">
            {/* Map header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-3 sm:px-5 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={18} className="text-brand-600 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Pakistan Complaint Map</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{filteredMarkers.length} / {mapMarkers.length} complaints</span>
              </div>
              <button onClick={() => setShowMap(false)} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            {/* Legend with checkboxes */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 border-b border-slate-100 bg-slate-50 px-3 sm:px-5 py-2 text-xs">
              <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-500">
                <input type="checkbox" checked={allChecked} onChange={e => toggleAllStatuses(e.target.checked)} className="rounded border-slate-300" />
                All
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={checkedStatuses.PENDING} onChange={() => toggleStatus("PENDING")} className="rounded border-slate-300" />
                <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" /> Pending
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={checkedStatuses.ASSIGNED} onChange={() => toggleStatus("ASSIGNED")} className="rounded border-slate-300" />
                <span className="inline-block h-3 w-3 rounded-full bg-orange-500" /> Assigned
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={checkedStatuses.IN_PROGRESS} onChange={() => toggleStatus("IN_PROGRESS")} className="rounded border-slate-300" />
                <span className="inline-block h-3 w-3 rounded-full bg-blue-600" /> In Progress
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={checkedStatuses.MARKED_RESOLVED} onChange={() => toggleStatus("MARKED_RESOLVED")} className="rounded border-slate-300" />
                <span className="inline-block h-3 w-3 rounded-full bg-cyan-500" /> Marked Resolved
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={checkedStatuses.RESOLVED} onChange={() => toggleStatus("RESOLVED")} className="rounded border-slate-300" />
                <span className="inline-block h-3 w-3 rounded-full bg-green-600" /> Resolved
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={checkedStatuses.OFFICER_REVIEW} onChange={() => toggleStatus("OFFICER_REVIEW")} className="rounded border-slate-300" />
                <span className="inline-block h-3 w-3 rounded-full bg-red-600" /> Officer Review
              </label>
            </div>
            {/* Map body */}
            <div className="relative min-h-0 flex-1" style={{ minHeight: "400px" }}>
              {mapLoading ? (
                <div className="flex h-full items-center justify-center text-slate-400">Loading map data…</div>
              ) : filteredMarkers.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400">No complaints match the selected filters.</div>
              ) : (
                <LeafletMap
                  center={[30.3753, 69.3451]}
                  zoom={5}
                  height="100%"
                  maxBounds={PAKISTAN_BOUNDS}
                  minZoom={5}
                  markers={filteredMarkers.map((m: any) => ({
                    id: m.id,
                    lat: m.lat,
                    lng: m.lng,
                    color: m.color,
                    label: `<div style="min-width:200px;cursor:pointer" onclick="window.__pukarOpenReceipt('${m.id}')"><b style="font-size:13px">${escHtml(m.category)}</b><br/><span style="color:#64748b;font-size:11px">${escHtml(m.code)} — ${escHtml(m.area)}, ${escHtml(m.district)}</span><br/><span style="color:#475569;font-size:11px">Citizen: ${escHtml(m.citizenName ?? "Unknown")}</span>${m.citizenPhone ? `<br/><span style="color:#059669;font-size:11px;font-weight:600"> ${escHtml(m.citizenPhone)}</span>` : ""}<br/><span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;background:${
                      ({yellow:'#fef9c3',orange:'#ffedd5',blue:'#dbeafe',cyan:'#cffafe',green:'#dcfce7',red:'#fee2e2'} as Record<string,string>)[m.color]||'#f1f5f9'
                    };color:${
                      ({yellow:'#854d0e',orange:'#9a3412',blue:'#1e40af',cyan:'#155e75',green:'#166534',red:'#991b1b'} as Record<string,string>)[m.color]||'#475569'
                    }">${escHtml(m.status.replace(/_/g,' '))}</span><br/><span style="color:#6366f1;font-size:10px;margin-top:3px;display:block">📋 Click for full receipt →</span></div>`,
                  }))}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptMarker && (() => {
        const m = receiptMarker;
        const STATUS_FLOW = ["PENDING", "ASSIGNED", "IN_PROGRESS", "MARKED_RESOLVED", "RESOLVED"];
        const reachedIdx = STATUS_FLOW.indexOf(m.status);
        const isReview = m.status === "OFFICER_REVIEW";
        const daysSince = Math.ceil((Date.now() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const daysToDeadline = m.deadline ? Math.ceil((new Date(m.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={() => setReceiptMarker(null)}>
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Receipt header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
                <div>
                  <div className="font-mono text-xs text-slate-400">{m.code}</div>
                  <h3 className="text-base font-bold text-slate-900">{m.title || m.category || "Complaint"}</h3>
                </div>
                <button onClick={() => setReceiptMarker(null)} className="rounded-lg p-1.5 hover:bg-slate-100">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
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
                      m.color === "yellow" ? "bg-yellow-100 text-yellow-800" :
                      m.color === "orange" ? "bg-orange-100 text-orange-800" :
                      m.color === "blue" ? "bg-blue-100 text-blue-800" :
                      m.color === "cyan" ? "bg-cyan-100 text-cyan-800" :
                      m.color === "green" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>{m.status.replace(/_/g, " ")}</span>
                  </div>
                </div>

                {/* Description */}
                {m.description && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">DESCRIPTION</div>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{m.description}</p>
                  </div>
                )}

                {/* Media */}
                {m.mediaUrls && m.mediaUrls.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">MEDIA ATTACHMENTS</div>
                    <div className="grid grid-cols-2 gap-2">
                      {m.mediaUrls.map((url: string, i: number) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
                        const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
                        const isAudio = /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i.test(url);
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:border-brand-400 transition-colors group">
                            {isImage ? (
                              <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                            ) : isVideo ? (
                              <div className="relative w-full h-28 bg-slate-900 flex items-center justify-center">
                                <video src={url} className="w-full h-full object-cover" muted />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                              </div>
                            ) : isAudio ? (
                              <div className="w-full h-28 bg-gradient-to-br from-purple-50 to-indigo-100 flex flex-col items-center justify-center p-2">
                                <svg className="w-8 h-8 text-purple-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                <span className="text-[10px] text-purple-700 font-medium">Audio</span>
                              </div>
                            ) : (
                              <div className="w-full h-28 bg-slate-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">AREA</div>
                    <div className="text-sm text-slate-700">{m.area}, {m.district}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">DEPARTMENT</div>
                    <div className="text-sm text-slate-700">{m.category ?? "Uncategorized"}</div>
                  </div>
                </div>

                {/* Citizen & Employee */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">CITIZEN</div>
                    <div className="text-sm font-medium text-slate-800">{m.citizenName ?? "Unknown"}</div>
                    {m.citizenPhone && <div className="text-xs text-emerald-600 font-medium"> {m.citizenPhone}</div>}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">ASSIGNED EMPLOYEE</div>
                    {m.employeeName ? (
                      <>
                        <div className="text-sm font-medium text-slate-800">{m.employeeName}</div>
                        {m.employeeDesignation && <div className="text-xs text-slate-500">{m.employeeDesignation}</div>}
                        {m.employeePhone && <div className="text-xs text-emerald-600 font-medium"> {m.employeePhone}</div>}
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
                    <div className="text-sm text-slate-700">{new Date(m.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{daysSince} days ago</div>
                  </div>
                  {m.deadline && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">DEADLINE</div>
                      <div className={`text-sm font-medium ${daysToDeadline !== null && daysToDeadline < 0 ? "text-red-600" : "text-slate-700"}`}>
                        {new Date(m.deadline).toLocaleDateString()}
                      </div>
                      {daysToDeadline !== null && <div className={`text-xs ${daysToDeadline < 0 ? "text-red-500" : "text-slate-400"}`}>{daysToDeadline < 0 ? `${Math.abs(daysToDeadline)} days overdue` : `${daysToDeadline} days left`}</div>}
                    </div>
                  )}
                </div>

                {/* History timeline */}
                {m.history && m.history.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">ACTIVITY TIMELINE</div>
                    <div className="space-y-2">
                      {m.history.map((h: any, i: number) => (
                        <div key={i} className="flex gap-2">
                          <div className="flex flex-col items-center">
                            <div className="h-2 w-2 rounded-full bg-brand-500 mt-1.5" />
                            {i < m.history.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
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

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Megaphone size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Send Order to CMOs</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Select one or multiple CMOs to receive this order</p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Select CMOs</label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {cmos.map((cmo: any) => (
                    <label key={cmo.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" value={cmo.id}
                        checked={selectedCmos.includes(cmo.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedCmos([...selectedCmos, cmo.id]);
                          else setSelectedCmos(selectedCmos.filter(id => id !== cmo.id));
                        }}
                        className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">{cmo.name}</span>
                      <span className="text-xs text-slate-400">({cmo.email})</span>
                    </label>
                  ))}
                  {cmos.length === 0 && <div className="py-2 text-center text-xs text-slate-400">No CMOs available</div>}
                </div>
                {selectedCmos.length > 0 && (
                  <div className="mt-1 text-xs text-indigo-600">{selectedCmos.length} CMO(s) selected</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Title / Subject</label>
                <input type="text" value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="e.g., No electricity for 3 hours tomorrow"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Detailed Message</label>
                <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} rows={3} placeholder="Provide details about the order..."
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
              <Button className="flex-1 flex items-center justify-center gap-2" disabled={bcSending || !bcTitle || !bcMessage || selectedCmos.length === 0} onClick={sendBroadcast}>
                <Send size={14} /> {bcSending ? "Sending…" : "Send Order"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
