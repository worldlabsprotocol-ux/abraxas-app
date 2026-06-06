// FILE: lib/notifications/index.ts
// Singleton. Import notificationService anywhere in client code.
// To swap providers later (e.g. email), replace new LocalNotificationService()
// with new EmailNotificationService() — zero call-site changes required.
import { LocalNotificationService } from "./LocalNotificationService";

export type {
  NotificationService,
  AppNotification,
  CreateNotificationInput,
  NotificationType,
} from "./types";

export const notificationService = new LocalNotificationService();
