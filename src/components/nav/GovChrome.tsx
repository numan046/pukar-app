"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/types";
import { RadarMark } from "@/components/Brand";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import {
  LayoutDashboard, FileText, Users, Settings, LogOut, Key, Menu, X, Bell, ChevronLeft, MessageSquare, BarChart3, MapPin, FolderKanban,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: string, basePath: string): NavItem[] {
  const items: NavItem[] = [
    { label: "Dashboard", href: basePath, icon: <LayoutDashboard size={18} /> },
  ];

  if (role === "SUPER_ADMIN") {
    items.push(
      { label: "Departments", href: "/admin/departments", icon: <Settings size={18} /> },
      { label: "Users", href: "/admin/users", icon: <Users size={18} /> },
      { label: "Categories", href: "/admin/categories", icon: <FileText size={18} /> },
    );
  } else if (role === "CM") {
    items.push(
      { label: "Analytics", href: "/cm/analytics", icon: <BarChart3 size={18} /> },
      { label: "AI Chatbot", href: "/cm/chatbot", icon: <MessageSquare size={18} /> },
    );
  } else if (role === "CMO") {
    items.push(
      { label: "Districts", href: "/cmo/districts", icon: <MapPin size={18} /> },
      { label: "Complaints", href: "/cmo/complaints", icon: <FileText size={18} /> },
      { label: "Analytics", href: "/cmo/analytics", icon: <BarChart3 size={18} /> },
    );
  } else if (role === "DEPARTMENT_OFFICER") {
    items.push(
      { label: "Complaints", href: "/officer/complaints", icon: <FileText size={18} /> },
      { label: "Master Problems", href: "/officer/master-problems", icon: <FolderKanban size={18} /> },
      { label: "Employees", href: "/officer/employees", icon: <Users size={18} /> },
    );
  } else if (role === "EMPLOYEE") {
    items.push(
      { label: "My Complaints", href: "/employee/complaints", icon: <FileText size={18} /> },
    );
  }

  return items;
}

export function GovChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const basePath = user?.role === "SUPER_ADMIN" ? "/admin" : user?.role === "CM" ? "/cm" : user?.role === "CMO" ? "/cmo" : user?.role === "EMPLOYEE" ? "/employee" : "/officer";
  const navItems = getNavItems(user?.role ?? "", basePath);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.user) { router.replace("/"); return; }
      setUser(d.user);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications").then((r) => r.json()).then((d) => {
      setUnreadCount(d.unreadCount ?? 0);
    }).catch(() => {});
  }, [user]);

  // Refresh bell count when tab regains focus OR when notifications are marked read
  useEffect(() => {
    const refresh = () => {
      if (!user) return;
      fetch("/api/notifications").then((r) => r.json()).then((d) => {
        setUnreadCount(d.unreadCount ?? 0);
      }).catch(() => {});
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("ppr:notifications-read", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("ppr:notifications-read", refresh);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RadarMark size={48} animated />
      </div>
    );
  }

  const roleLabel = user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "CM" ? "Chief Minister" : user.role === "CMO" ? "Chief Minister Officer" : user.role === "DEPARTMENT_OFFICER" ? "Department Officer" : "Employee";

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 lg:w-64 transform bg-gradient-to-b from-ink-900 via-ink-800 to-brand-950 text-white shadow-2xl transition-transform duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <RadarMark size={28} animated />
          <div>
            <div className="text-sm font-bold tracking-wide">Pukar</div>
            <div className="text-[10px] uppercase tracking-wider text-brand-300/80">{roleLabel}</div>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                pathname === item.href
                  ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-glow"
                  : "text-slate-300 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/20 p-3 backdrop-blur-sm">
          <div className="mb-2 px-2 text-xs text-slate-400 truncate">{user.name}</div>
          <div className="flex gap-2">
            <button onClick={() => setShowChangePw(true)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-xs text-slate-300 hover:bg-white/20 hover:text-white" title="Change Password">
              <Key size={14} /> Password
            </button>
            <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => router.replace("/?login=1")); }} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-xs text-red-300 hover:bg-red-500/30 hover:text-red-200" title="Logout">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-56 xl:ml-64">
        {/* Header */}
        <header className="glass sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/60 px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1 hover:bg-slate-900/5 lg:hidden"><Menu size={20} /></button>
            <button onClick={() => router.back()} className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm text-slate-500 hover:bg-slate-900/5 hover:text-slate-800">
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/notifications")} className="relative rounded-full p-1.5 text-slate-500 hover:bg-slate-900/5 hover:text-slate-800">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-[10px] font-bold text-white shadow-sm">{unreadCount}</span>
              )}
            </button>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user.name}</span>
          </div>
        </header>

        <main className="flex-1 animate-fade-in-up p-2 sm:p-4 md:p-6">{children}</main>
      </div>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  );
}
