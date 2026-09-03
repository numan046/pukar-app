"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Bell, Megaphone, AlertCircle } from "lucide-react";

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  function load() {
    fetch("/api/notifications").then(r => r.json()).then(d => setNotifications(d.notifications ?? []));
    fetch("/api/broadcasts").then(r => r.json()).then(d => setAnnouncements(d.broadcasts ?? []));
  }

  // Auto mark all as read when alerts page is opened (user has seen them)
  useEffect(() => {
    load();
    fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).then(() => {
      // Tell bell icon to refresh
      window.dispatchEvent(new Event("ppr:notifications-read"));
      // Reload after marking all read
      setTimeout(load, 300);
    });
  }, []);

  async function markRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      // Update local state immediately
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      // Tell bell icon to refresh
      window.dispatchEvent(new Event("ppr:notifications-read"));
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  }

  function handleNotifClick(n: any) {
    if (!n.is_read) markRead(n.id);
  }

  // Separate broadcast-type notifications from regular ones
  const broadcastNotifs = notifications.filter((n: any) => n.type === "BROADCAST");
  const regularNotifs = notifications.filter((n: any) => n.type !== "BROADCAST");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Notifications & Announcements</h1>

      {/* Government Announcements Section */}
      {announcements.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Megaphone size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800">Government Announcements</h2>
          </div>
          <div className="flex flex-col gap-2">
            {announcements.map((a: any) => (
              <Card key={a.id} className="border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-indigo-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-indigo-900">{a.title}</span>
                      <span className="text-[10px] text-slate-500">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{a.message}</p>
                    {a.valid_until && (
                      <div className="mt-2 text-[10px] font-medium text-amber-600">
                        Valid until: {new Date(a.valid_until).toLocaleString()}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-slate-400">
                      {a.sender_role === "CM" ? "Chief Minister" : a.sender_role === "CMO" ? "Department Head" : "District Officer"}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Notifications (from officer/CMO sends) */}
      {broadcastNotifs.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Megaphone size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-700">Alert Notifications</h2>
          </div>
          <div className="flex flex-col gap-2">
            {broadcastNotifs.map((n: any) => (
              <div key={n.id} onClick={() => handleNotifClick(n)} className="cursor-pointer">
              <Card className={`border-amber-200 bg-amber-50/30 p-3 transition hover:border-amber-300 ${!n.is_read ? "ring-1 ring-amber-300" : ""}`}>
                <div className="flex items-start gap-2">
                  <Bell size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{n.title_en}</span>
                      {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                    </div>
                    <div className="text-xs text-slate-500">{n.body_en}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                      {n.valid_until && (
                        <span className="text-[10px] font-medium text-amber-600">Deadline: {new Date(n.valid_until).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Notifications */}
      {regularNotifs.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Bell size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Complaint Updates</h2>
          </div>
          <div className="flex flex-col gap-2">
            {regularNotifs.map((n: any) => (
              <div key={n.id} onClick={() => handleNotifClick(n)} className="cursor-pointer">
              <Card className={`flex items-start gap-3 p-3 transition hover:border-brand-300 ${!n.is_read ? "border-brand-200 bg-brand-50/30 ring-1 ring-brand-200" : ""}`}>
                <Bell size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{n.title_en}</div>
                  <div className="text-xs text-slate-500">{n.body_en}</div>
                  <div className="mt-1 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {announcements.length === 0 && notifications.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <Bell size={32} className="mx-auto mb-2 text-slate-300" />
          <p>No notifications or announcements yet</p>
        </div>
      )}
    </div>
  );
}
