// FILE: lib/partner/integrationObservability/sanitize.ts
// Allowlisted serialization for integration lifecycle events.

import { detectDisclosureLeaks } from "@/lib/privacy/selectiveDisclosure/leakDetector";
import {
  INTEGRATION_EVENT_ALLOWED_METADATA_KEYS,
  INTEGRATION_EVENT_PROHIBITED_KEYS,
} from "./contract";

const SECRET_PATTERNS = [
  /abx_live_[a-z0-9_-]{12,}/i,
  /abx_test_[a-z0-9_-]{12,}/i,
  /whsec_[a-z0-9_-]+/i,
  /https?:\/\//i,
];

function scalar(value: unknown): value is string | number | boolean | null {
  if (value == null) return true;
  const type = typeof value;
  return type === "string" || type === "number" || type === "boolean";
}

function looksSensitive(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) return true;
  return detectDisclosureLeaks({ v: value }).length > 0;
}

export function sanitizeIntegrationEventMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean | null> {
  const source = metadata ?? {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of INTEGRATION_EVENT_ALLOWED_METADATA_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if ((INTEGRATION_EVENT_PROHIBITED_KEYS as readonly string[]).includes(key)) continue;
    const value = source[key];
    if (!scalar(value) || looksSensitive(value)) continue;
    out[key] = value;
  }
  return out;
}

export function integrationObservabilityLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  for (const key of INTEGRATION_EVENT_PROHIBITED_KEYS) {
    if (blob.includes(`"${key}"`)) leaks.push(key);
  }
  if (/abx_(live|test)_[a-z0-9_-]{12,}/.test(blob)) leaks.push("raw_api_key");
  if (/whsec_/.test(blob)) leaks.push("webhook_secret");
  if (/https:\/\//.test(blob)) leaks.push("callback_url");
  if (/date_of_birth|legal_name|wallet_address|passport_contents/.test(blob)) leaks.push("pii");
  return leaks;
}
