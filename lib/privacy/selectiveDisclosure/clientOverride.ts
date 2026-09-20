// FILE: lib/privacy/selectiveDisclosure/clientOverride.ts
// Browser and callback disclosure configuration is never authority.

import { SELECTIVE_DISCLOSURE_CLIENT_OVERRIDE_KEYS } from "./contract";

export type ClientDisclosureCheck =
  | { ok: true }
  | { ok: false; reason: "client_override_rejected" };

export function rejectClientDisclosureConfig(raw: unknown): ClientDisclosureCheck {
  if (raw == null) return { ok: true };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "client_override_rejected" };
  }
  const keys = Object.keys(raw as Record<string, unknown>);
  if (keys.some((key) => (SELECTIVE_DISCLOSURE_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key))) {
    return { ok: false, reason: "client_override_rejected" };
  }
  return { ok: true };
}
