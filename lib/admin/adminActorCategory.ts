// FILE: lib/admin/adminActorCategory.ts
// Non-PII admin actor categories — never store email or local-part in persisted metadata.

import type { AdminAccessMethod } from "@/lib/adminAuth";

export type AdminActorCategory =
  | "admin_authorized_email"
  | "admin_pin"
  | "admin_unknown";

export function resolveAdminActorCategory(method: AdminAccessMethod): AdminActorCategory {
  if (method === "email") return "admin_authorized_email";
  if (method === "pin_header" || method === "pin_cookie") return "admin_pin";
  return "admin_unknown";
}
