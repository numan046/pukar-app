// Note: ID generation lives in ./id.ts (uses node:crypto) so this file
// stays safe to import from client components without pulling Node
// built-ins into the browser bundle.

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}


/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Simple word-overlap similarity, 0..1. Good enough for a demo duplicate detector. */
export function textSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  const setA = norm(a);
  const setB = norm(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

export function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3600000;
}

export function formatCountdown(deadlineIso: string | null): { label: string; overdue: boolean; urgent: boolean } {
  if (!deadlineIso) return { label: "—", overdue: false, urgent: false };
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hrs = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const urgent = !overdue && hrs < 6;
  if (overdue) {
    return { label: `Overdue by ${hrs}h ${mins}m`, overdue, urgent: false };
  }
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return { label: `${days}d ${remHrs}h remaining`, overdue, urgent };
  }
  return { label: `${hrs}h ${mins}m remaining`, overdue, urgent };
}
