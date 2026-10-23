// In-app notifications and email preferences for customers.
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db.ts";
import { notification, notificationSettings } from "./schema.ts";
import type { NotificationSetting } from "./types.ts";

export async function listNotifications(customerId: string, limit = 50) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.customerId, customerId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

export async function countUnread(customerId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(notification)
    .where(and(eq(notification.customerId, customerId), isNull(notification.readAt)));
  return row?.n ?? 0;
}

export async function markAllRead(customerId: string) {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.customerId, customerId), isNull(notification.readAt)));
}

export async function getNotificationSettings(customerId: string): Promise<Record<NotificationSetting, boolean>> {
  const [row] = await db.select().from(notificationSettings).where(eq(notificationSettings.customerId, customerId));
  return {
    confirmations: row?.confirmations ?? true,
    reminders: row?.reminders ?? true,
    cancellations: row?.cancellations ?? true,
    paymentUpdates: row?.paymentUpdates ?? true,
  };
}

export async function setNotificationSetting(customerId: string, setting: NotificationSetting, on: boolean) {
  await db
    .insert(notificationSettings)
    .values({ customerId, [setting]: on })
    .onConflictDoUpdate({ target: notificationSettings.customerId, set: { [setting]: on } });
}
