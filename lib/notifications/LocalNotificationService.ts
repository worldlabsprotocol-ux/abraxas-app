// FILE: lib/notifications/LocalNotificationService.ts
// localStorage-backed notification store.
// Implements NotificationService so it can be replaced with an email
// or push provider without touching call sites.
import type {
  AppNotification,
  CreateNotificationInput,
  NotificationService,
} from "./types";

const KEY = "abraxas_notifications_v1";
const MAX = 50;

function gen(): string {
  return (
    "notif-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

function read(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function write(ns: AppNotification[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ns.slice(0, MAX)));
}

export class LocalNotificationService implements NotificationService {
  createNotification(input: CreateNotificationInput): AppNotification {
    const n: AppNotification = {
      id:        gen(),
      type:      input.type,
      title:     input.title,
      body:      input.body,
      data:      input.data ?? {},
      createdAt: new Date().toISOString(),
      viewed:    false,
    };
    write([n, ...read()]);
    return n;
  }

  markViewed(id: string): void {
    write(read().map(n => (n.id === id ? { ...n, viewed: true } : n)));
  }

  markAllViewed(): void {
    write(read().map(n => ({ ...n, viewed: true })));
  }

  getUnreadCount(): number {
    return read().filter(n => !n.viewed).length;
  }

  getNotifications(): AppNotification[] {
    return read();
  }

  clear(): void {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
  }
}
