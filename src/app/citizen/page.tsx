"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { ArrowRight, ListChecks, Bell, FileText, PlusCircle } from "lucide-react";
import type { SessionUser } from "@/types";

export default function CitizenHome() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user));
    fetch("/api/complaints").then(r => r.json()).then(d => setComplaints(d.complaints ?? []));
  }, []);

  if (!user) return null;

  const active = complaints.filter(c => !["RESOLVED"].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === "RESOLVED").length;
  const needsVerify = complaints.filter(c => c.status === "MARKED_RESOLVED").length;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <div className="text-sm text-slate-500">Assalam-o-Alaikum,</div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{user.name}</h1>
      </div>

      <Link href="/citizen/report"
        className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 sm:px-6 py-4 sm:py-5 text-white shadow-lg transition hover:from-brand-700 hover:to-brand-800">
        <div className="min-w-0 flex-1">
          <div className="text-base sm:text-lg font-bold leading-tight">Report a Problem</div>
          <div className="text-xs sm:text-sm text-brand-100 leading-tight mt-0.5">Text, voice, photo or video — AI routes it to the right department.</div>
        </div>
        <ArrowRight className="shrink-0 ml-2 hidden sm:block" />
      </Link>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5 sm:p-4 text-center"><div className="text-lg sm:text-2xl font-bold text-slate-900">{active}</div><div className="text-[10px] sm:text-xs font-medium text-slate-500">Active</div></Card>
        <Card className="p-2.5 sm:p-4 text-center"><div className="text-lg sm:text-2xl font-bold text-emerald-600">{resolved}</div><div className="text-[10px] sm:text-xs font-medium text-slate-500">Resolved</div></Card>
        <Card className="p-2.5 sm:p-4 text-center">
          <div className={`text-lg sm:text-2xl font-bold ${needsVerify > 0 ? "text-orange-600" : "text-slate-400"}`}>{needsVerify}</div>
          <div className="text-[10px] sm:text-xs font-medium text-slate-500">To Verify</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Link href="/citizen/complaints">
          <Card className="flex items-center gap-3 p-4 transition hover:border-brand-300">
            <div className="rounded-full bg-brand-50 p-2 text-brand-600"><ListChecks size={20} /></div>
            <span className="text-sm font-semibold text-slate-700">My Complaints</span>
          </Card>
        </Link>
        <Link href="/notifications">
          <Card className="flex items-center gap-3 p-4 transition hover:border-brand-300">
            <div className="rounded-full bg-brand-50 p-2 text-brand-600"><Bell size={20} /></div>
            <span className="text-sm font-semibold text-slate-700">Notifications</span>
          </Card>
        </Link>
      </div>

      {/* Recent Complaints */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Complaints</h2>
          <Link href="/citizen/complaints" className="text-[10px] sm:text-xs font-semibold text-brand-600 shrink-0">View all</Link>
        </div>
        {complaints.length === 0 ? (
          <div className="mt-3 py-8 text-center text-slate-400">
            <p>No complaints yet.</p>
            <Link href="/citizen/report" className="mt-1 inline-block text-sm font-medium text-brand-600 hover:underline">Submit your first complaint →</Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {complaints.slice(0, 5).map((c) => (
              <Link key={c.id} href={`/citizen/complaints/${c.id}`}>
                <Card className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 transition hover:border-brand-300">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-mono text-slate-400">{c.complaint_code}</span>
                      {c.category && <span className="text-[10px] sm:text-xs text-slate-500 truncate">· {c.category}</span>}
                    </div>
                    <div className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-slate-800">{c.title || c.description?.slice(0, 60)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={c.status} />
                    {c.status === "MARKED_RESOLVED" && <span className="text-[10px] font-bold text-orange-600">Verify →</span>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
