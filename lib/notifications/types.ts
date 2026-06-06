// FILE: lib/notifications/types.ts
// NotificationService interface — swap LocalNotificationService for an
// email/push provider later without changing any call sites.

export type NotificationType =
  | "wyoming_request"
  | "asset_update"
  | "payment_received"
  | "verification_complete";

export interface AppNotification {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  data:      Record<string, string>;
  createdAt: string;
  viewed:    boolean;
}

export interface CreateNotificationInput {
  type:  NotificationType;
  title: string;
  body:  string;
  data?: Record<string, string>;
}

/** Contract every notification provider must satisfy. */
export interface NotificationService {
  createNotification(input: CreateNotificationInput): AppNotification;
  markViewed(id: string): void;
  markAllViewed(): void;
  getUnreadCount(): number;
  getNotifications(): AppNotification[];
  clear(): void;
}
