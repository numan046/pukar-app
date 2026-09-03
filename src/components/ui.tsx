import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl2 border border-white/60 bg-white/80 shadow-card backdrop-blur-sm transition-shadow duration-300 hover:shadow-lift",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary:
      "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow hover:from-brand-400 hover:to-brand-600 hover:shadow-lift active:scale-[.98] disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none",
    secondary:
      "border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:border-brand-300 hover:bg-brand-50 active:scale-[.98]",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-900/5 active:scale-[.98]",
    danger:
      "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm hover:from-red-400 hover:to-red-600 active:scale-[.98]",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed",
        styles,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function KpiCard({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "default" | "danger" | "warning" | "success" }) {
  const toneClass = {
    default: "text-slate-900",
    danger: "text-red-600",
    warning: "text-amber-600",
    success: "text-brand-700",
  }[tone ?? "default"];
  const accentClass = {
    default: "from-slate-300 to-slate-400",
    danger: "from-red-400 to-red-600",
    warning: "from-amber-300 to-amber-500",
    success: "from-brand-400 to-brand-600",
  }[tone ?? "default"];
  return (
    <Card className="group relative overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70 transition-opacity group-hover:opacity-100", accentClass)} />
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("mt-2 text-3xl font-bold", toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-1 p-10 text-center">
      <div className="text-base font-semibold text-slate-700">{title}</div>
      {body && <div className="text-sm text-slate-500">{body}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-700" />
        {children}
      </h2>
      {action}
    </div>
  );
}
