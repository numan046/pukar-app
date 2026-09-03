"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { SessionUser } from "@/types";

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user));
  }, []);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Profile</h1>
      <Card className="flex flex-col gap-3 p-5">
        <Field label="Name" value={user.name} />
        <Field label="Email" value={user.email} />
        {user.phone && <Field label="Phone" value={user.phone} />}
        <Field label="Role" value={user.role.replaceAll("_", " ")} />
      </Card>
      <Card className="p-5">
        <div className="mb-2 text-sm font-semibold text-slate-700">Language</div>
        <LanguageSwitcher current={user.language} />
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}
