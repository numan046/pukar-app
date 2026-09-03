import { listAllComplaints } from "@/lib/db/repo";
import type { ComplaintRow } from "@/types";

export interface RiskSignal {
  category: string;
  departmentId: string | null;
  areaLabel: string;
  dailyCounts: { date: string; count: number }[];
  trendPct: number;
  level: "WATCH" | "EMERGING" | "HIGH_RISK";
  label: string;
}

/**
 * A demo early-warning signal: groups recent complaints by
 * category + department and looks for a rising day-over-day trend.
 * This is explicitly a prediction/heuristic, never an official
 * emergency determination — the UI must label it as such.
 */
export async function computeRiskSignals(days = 7): Promise<RiskSignal[]> {
  const all = await listAllComplaints();
  const since = Date.now() - days * 24 * 3600 * 1000;
  const recent = all.filter((c) => new Date(c.created_at).getTime() >= since);

  const groups = new Map<string, ComplaintRow[]>();
  for (const c of recent) {
    const key = `${c.category ?? "Unknown"}::${c.department_id ?? "none"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const signals: RiskSignal[] = [];

  for (const [key, complaints] of groups) {
    const [category, departmentId] = key.split("::");
    if (complaints.length < 3) continue;

    const byDay = new Map<string, number>();
    for (const c of complaints) {
      const day = c.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const dailyCounts = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    if (dailyCounts.length < 2) continue;

    const firstHalf = dailyCounts.slice(0, Math.ceil(dailyCounts.length / 2));
    const secondHalf = dailyCounts.slice(Math.ceil(dailyCounts.length / 2));
    const avg = (arr: typeof dailyCounts) => arr.reduce((s, d) => s + d.count, 0) / (arr.length || 1);
    const firstAvg = avg(firstHalf) || 0.01;
    const secondAvg = avg(secondHalf);
    const trendPct = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);

    let level: RiskSignal["level"] = "WATCH";
    if (trendPct >= 150 && complaints.length >= 8) level = "HIGH_RISK";
    else if (trendPct >= 60 && complaints.length >= 5) level = "EMERGING";
    else continue; // not significant enough to surface

    const areaLabel = complaints[0]?.area || complaints[0]?.address || "Reported area";
    const label =
      level === "HIGH_RISK"
        ? `⚠️ High-risk cluster: ${category} complaints up ${trendPct}% in ${areaLabel}. Complaint frequency and geographic clustering indicate a potential emerging risk zone.`
        : `Emerging pattern: ${category} complaints trending up ${trendPct}% in ${areaLabel}.`;

    signals.push({ category, departmentId: departmentId === "none" ? null : departmentId, areaLabel, dailyCounts, trendPct, level, label });
  }

  return signals.sort((a, b) => b.trendPct - a.trendPct);
}
