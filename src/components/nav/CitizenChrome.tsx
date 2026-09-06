"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Bell, ShieldAlert, User, LogOut, Globe, ArrowLeft, Key } from "lucide-react";
import { RadarMark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import type { SessionUser } from "@/types";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/citizen", label: "Home", icon: Home },
  { href: "/citizen/complaints", label: "Complaints", icon: FileText },
  { href: "/citizen/alerts", label: "Alerts", icon: ShieldAlert },
  { href: "/citizen/profile", label: "Profile", icon: User },
];

export function CitizenChrome({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [showPwModal, setShowPwModal] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setUnread(d.unreadCount ?? 0))
      .catch(() => {});
  }, [pathname]);

  // Refresh bell count when tab regains focus OR when notifications are marked read
  useEffect(() => {
    const refresh = () => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setUnread(d.unreadCount ?? 0))
        .catch(() => {});
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("ppr:notifications-read", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("ppr:notifications-read", refresh);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/?login=1");
  }

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 md:pb-0">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/60 px-4 py-3 shadow-sm">
        {pathname !== "/citizen" && (
          <button onClick={() => router.push("/citizen")} className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-900/5 transition">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <RadarMark size={28} />
          <span className="text-sm font-bold gradient-text">Pukar</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-1 sm:flex">
            <LanguageSwitcher current={(typeof document !== "undefined" && document.cookie.includes("lang=UR") ? "UR" : "EN") as "EN" | "UR"} />
          </div>
          <Link href="/citizen/alerts" className="relative rounded-full p-2 hover:bg-slate-900/5">
            <Bell size={20} className="text-slate-600" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-[10px] font-bold text-white shadow-sm">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <button onClick={() => setShowPwModal(true)} className="rounded-full p-2 hover:bg-slate-900/5" title="Change password">
            <Key size={18} className="text-slate-500" />
          </button>
          <button onClick={logout} className="rounded-full p-2 hover:bg-slate-900/5" title="Log out">
            <LogOut size={18} className="text-slate-500" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl animate-fade-in-up px-3 sm:px-4 py-4 sm:py-5">{children}</main>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}

      <nav className="glass fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200/60 shadow-[0_-4px_16px_rgba(16,24,40,.06)] md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />}
              <Icon size={20} className={cn("transition-transform duration-200", active && "-translate-y-0.5 scale-110")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
