import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications, markNotificationRead, markAllNotificationsRead, unreadNotificationCount, getNotificationById } from "@/lib/db/repo";
import { getDb } from "@/lib/db/client";

// Auto-migrate: add valid_until column if missing (for existing Turso databases)
let _migrated = false;
async function ensureMigration() {
  if (_migrated) return;
  try {
    await getDb().execute("ALTER TABLE notifications ADD COLUMN valid_until TEXT");
  } catch {
    // Column already exists — safe to ignore
  }
  _migrated = true;
}

export async function GET() {
  await ensureMigration();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const notifications = await listNotifications(user.id);
  const unreadCount = await unreadNotificationCount(user.id);

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: NextRequest) {
  await ensureMigration();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { notificationId, markAll } = await req.json();

  if (markAll) {
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ success: true });
  }

  if (notificationId) {
    // Ownership check: only mark your own notifications
    const notif = await getNotificationById(notificationId);
    if (!notif || notif.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }
    await markNotificationRead(notificationId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "notificationId or markAll required." }, { status: 400 });
}
