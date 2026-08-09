// FILE: lib/partner/webhooks/webhookDispatchError.ts
// Allowlisted dispatcher error categories — never persist or email raw exception text.

import { createHash } from "crypto";

export const DISPATCHER_ERROR_CATEGORIES = [
  "database_error",
  "network_error",
  "configuration_error",
  "timeout_error",
  "internal_error",
] as const;

export type DispatcherErrorCategory = (typeof DISPATCHER_ERROR_CATEGORIES)[number];

const CATEGORY_PATTERNS: Array<{ category: DispatcherErrorCategory; pattern: RegExp }> = [
  { category: "database_error", pattern: /\b(db|database|postgres|supabase|sql|relation|constraint)\b/i },
  { category: "network_error", pattern: /\b(network|fetch|econn|enotfound|socket|dns)\b/i },
  { category: "configuration_error", pattern: /\b(config|unconfigured|missing|not set|master_key)\b/i },
  { category: "timeout_error", pattern: /\b(timeout|timed out|abort)\b/i },
];

export function fingerprintDispatcherError(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 16);
}

export function classifyDispatcherError(err: unknown): {
  category: DispatcherErrorCategory;
  fingerprint: string;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const normalized = raw.toLowerCase();

  for (const entry of CATEGORY_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return {
        category: entry.category,
        fingerprint: fingerprintDispatcherError(raw),
      };
    }
  }

  return {
    category: "internal_error",
    fingerprint: fingerprintDispatcherError(raw),
  };
}

export function dispatcherErrorMetadata(err: unknown): {
  error_category: DispatcherErrorCategory;
  error_fingerprint: string;
} {
  const classified = classifyDispatcherError(err);
  return {
    error_category: classified.category,
    error_fingerprint: classified.fingerprint,
  };
}
