"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import { Bell, CheckCheck, FileText } from "lucide-react";

interface Notification {
  id: string; complaint_id: string | null; type: string;
  title_en: string; body_en: string; is_read: number; created_at: string;
  valid_until: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  function load() {
    fetch("/api/notifications").then(r => r.json()).then(d => {
      setNotifications(d.notifications ?? []);
      setLoading(false);
    });
  }
  useEffect(() => {
    load();
    // Auto mark all as read when notifications page is opened
    fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).then(() => {
      window.dispatchEvent(new Event("ppr:notifications-read"));
      setTimeout(load, 300);
    });
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setUserRole(d.user.role);
    });
  }, []);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      window.dispatchEvent(new Event("ppr:notifications-read"));
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  }

  async function markAllRead() {
    try {
      await fetch(`/api/notifications`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      window.dispatchEvent(new Event("ppr:notifications-read"));
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  }

  function handleClick(n: Notification) {
    if (!n.is_read) markRead(n.id);
    if (n.complaint_id) {
      // Navigate based on role
      if (userRole === "CMO") window.location.href = `/cmo/complaints/${n.complaint_id}`;
      else if (userRole === "DEPARTMENT_OFFICER") window.location.href = `/officer/complaints/${n.complaint_id}`;
      else if (userRole === "EMPLOYEE") window.location.href = `/employee/complaints/${n.complaint_id}`;
      else if (userRole === "CM") window.location.href = `/cm/complaints/${n.complaint_id}`;
      else window.location.href = `/citizen/complaints/${n.complaint_id}`;
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-400">Loading notifications…</div>;

  const unread = notifications.filter(n => !n.is_read);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">{unread.length} unread notification{unread.length !== 1 ? "s" : ""}</p>
        </div>
        {unread.length > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            <CheckCheck size={16} className="mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {notifications.map(n => (
          <div key={n.id} onClick={() => handleClick(n)} className={`cursor-pointer transition hover:border-brand-300 ${!n.is_read ? "border-brand-200 bg-brand-50/30" : ""}`}>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full p-1.5 ${!n.is_read ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-400"}`}>
                <Bell size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${!n.is_read ? "text-slate-900" : "text-slate-700"}`}>{n.title_en}</span>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{n.body_en}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                  {n.valid_until && (
                    <span className="text-[10px] font-medium text-amber-600">Deadline: {new Date(n.valid_until).toLocaleString()}</span>
                  )}
                </div>
              </div>
              {n.complaint_id && <FileText size={14} className="text-slate-400 mt-1" />}
            </div>
          </Card>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Bell size={32} className="mx-auto mb-2 text-slate-300" />
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
