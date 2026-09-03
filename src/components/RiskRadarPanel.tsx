"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { AlertTriangle, TrendingUp } from "lucide-react";

interface RiskSignal {
  category: string;
  areaLabel: string;
  trendPct: number;
  level: "WATCH" | "EMERGING" | "HIGH_RISK";
  label: string;
}

export function RiskRadarPanel() {
  const [signals, setSignals] = useState<RiskSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/risk-signals")
      .then((r) => r.json())
      .then((d) => setSignals(d.signals ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp size={18} className="text-amber-600" />
        <h2 className="text-sm font-bold text-slate-900">Pukar Insights</h2>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        AI risk signal / prediction — an early-warning pattern, not an official emergency determination.
      </p>
      {loading ? (
        <div className="py-4 text-center text-sm text-slate-400">Scanning complaint patterns…</div>
      ) : signals.length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-400">No significant emerging patterns detected right now.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {signals.map((s, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-3 text-sm ${
                s.level === "HIGH_RISK" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} />
                {s.category} — {s.areaLabel}
              </div>
              <div className="mt-1 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
