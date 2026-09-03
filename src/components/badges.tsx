import { cn } from "@/lib/utils";
import { priorityLabel, statusLabel, type Lang } from "@/lib/i18n";
import type { Priority, ComplaintStatus } from "@/types";
import { AlertTriangle, AlertCircle, Info, CircleDot } from "lucide-react";

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string; icon: React.ElementType }> = {
  P0: { bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle },
  P1: { bg: "bg-orange-100", text: "text-orange-700", icon: AlertCircle },
  P2: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Info },
  P3: { bg: "bg-green-100", text: "text-green-700", icon: CircleDot },
};

export function PriorityBadge({ priority, lang = "EN" }: { priority: Priority | null | undefined; lang?: Lang }) {
  if (!priority) return <span className="text-xs text-slate-400">—</span>;
  const s = PRIORITY_STYLES[priority];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", s.bg, s.text)}>
      <Icon size={12} />
      {priority} · {priorityLabel[priority]?.[lang] ?? priority}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  MARKED_RESOLVED: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  OFFICER_REVIEW: "bg-red-100 text-red-700",
  // Legacy
  SUBMITTED: "bg-slate-100 text-slate-700",
  AI_ANALYZED: "bg-indigo-100 text-indigo-700",
  ROUTED: "bg-indigo-100 text-indigo-700",
  WAITING: "bg-slate-100 text-slate-700",
  CLOSED: "bg-slate-200 text-slate-700",
  OVERDUE: "bg-red-100 text-red-700",
  ESCALATED: "bg-red-100 text-red-700",
  REOPENED: "bg-purple-100 text-purple-700",
  NEEDS_REVIEW: "bg-orange-100 text-orange-700",
};

export function StatusBadge({ status, lang = "EN" }: { status: ComplaintStatus | string; lang?: Lang }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700")}>
      {statusLabel[status]?.[lang] ?? status}
    </span>
  );
}

export function CountdownBadge({ label, overdue, urgent }: { label: string; overdue: boolean; urgent: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        overdue ? "bg-red-100 text-red-700" : urgent ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
      )}
    >
      {label}
    </span>
  );
}
