import { cookies } from "next/headers";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { getUserById } from "@/lib/db/repo";
import type { SessionUser } from "@/types";

const SESSION_COOKIE = "ppr_session";
const SECRET = process.env.SESSION_SECRET || "insecure-demo-secret-change-me";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------- Password hashing (scrypt, no external deps) ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// ---------- Signed session cookie ----------
function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, ts: Date.now() })).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    // Enforce server-side session expiry
    if (Date.now() - data.ts > SESSION_MAX_AGE_MS) return null;
    return data.uid as string;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = verifySessionToken(token);
  if (!uid) return null;
  const user = await getUserById(uid);
  if (!user || !user.is_active) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.department_id,
    districtId: user.district_id,
    language: user.language,
  };
}
