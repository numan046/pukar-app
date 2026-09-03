import { randomBytes } from "node:crypto";

export function newId(prefix = ""): string {
  const rand = randomBytes(9).toString("base64url");
  return prefix ? `${prefix}_${rand}` : rand;
}

/**
 * Generates a human-readable complaint code like PPR-2026-00124.
 * `seq` should be a monotonically increasing counter for the year.
 */
export function complaintCode(year: number, seq: number): string {
  return `PPR-${year}-${String(seq).padStart(5, "0")}`;
}
