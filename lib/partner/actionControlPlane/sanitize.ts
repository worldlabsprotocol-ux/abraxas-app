// FILE: lib/partner/actionControlPlane/sanitize.ts
// Fail-closed strip of secrets, receipts, wallets, PII, and provider payloads.

import { ACTION_CONTROL_PLANE_FORBIDDEN_KEYS } from "./contract";

function keyLooksForbidden(key: string): boolean {
  const lower = key.toLowerCase();
  return ACTION_CONTROL_PLANE_FORBIDDEN_KEYS.some((needle) => lower.includes(needle));
}

function valueLooksForbidden(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase();
  return (
    lower.startsWith("abx_test_")
    || lower.startsWith("abx_live_")
    || lower.startsWith("abx_whsec_")
    || lower.includes("eyj")
  );
}

export function sanitizeActionControlPlaneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeActionControlPlaneValue(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (keyLooksForbidden(key) || valueLooksForbidden(nested)) continue;
      out[key] = sanitizeActionControlPlaneValue(nested);
    }
    return out as T;
  }
  return value;
}

export function actionControlPlaneHasForbiddenMaterial(value: unknown): boolean {
  if (typeof value === "string") return valueLooksForbidden(value);
  if (Array.isArray(value)) return value.some(actionControlPlaneHasForbiddenMaterial);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
      return keyLooksForbidden(key) || actionControlPlaneHasForbiddenMaterial(nested);
    });
  }
  return false;
}
