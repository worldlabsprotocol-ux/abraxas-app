// FILE: lib/privacy/selectiveDisclosure/enforce.ts
// Allowlist redaction is the primary boundary. Leak detection is secondary.

import type { SelectiveDisclosureProfile } from "./contract";
import { SHARED_SURFACE_FIELDS } from "./contract";
import { allowedFieldsForSurface } from "./profiles";
import { detectDisclosureLeaks } from "./leakDetector";

export type DisclosureApplyResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; reason: "disclosure_invalid" | "disclosure_leak" };

const CLAIM_REF_KEYS = [
  "claim_id",
  "claim_type",
  "issuer_id",
  "status",
  "issued_at",
  "expires_at",
] as const;

export function pickAllowedKeys(
  payload: unknown,
  allowed: readonly string[],
): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const source = payload as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = redactNested(key, source[key]);
    }
  });
  return out;
}

function redactNested(key: string, value: unknown): unknown {
  if (key === "evaluated_claim_refs" && Array.isArray(value)) {
    return value.map((item) => pickAllowedKeys(item, CLAIM_REF_KEYS) ?? {});
  }
  if (key === "claim_labels" && Array.isArray(value)) {
    return value.map((item) => pickAllowedKeys(item, ["claim_type", "label", "will_share"]) ?? {});
  }
  if (key === "action_binding" && value && typeof value === "object" && !Array.isArray(value)) {
    return pickAllowedKeys(value, ["action_type", "action_scope", "nonce_state", "wallet_binding"]);
  }
  if (key === "payment_action_binding" && value && typeof value === "object" && !Array.isArray(value)) {
    return pickAllowedKeys(value, ["action_type", "action_scope", "nonce_state", "authorization_kind"]);
  }
  if (key === "signature" && value && typeof value === "object" && !Array.isArray(value)) {
    return pickAllowedKeys(value, ["alg", "version", "header", "timestamp_header", "id_header"]);
  }
  return value;
}

export function applyDisclosureProfile(
  payload: unknown,
  profile: SelectiveDisclosureProfile,
  surface: keyof typeof SHARED_SURFACE_FIELDS,
): DisclosureApplyResult {
  const allowed = allowedFieldsForSurface(profile, surface);
  if (!allowed.length) return { ok: false, reason: "disclosure_invalid" };
  const picked = pickAllowedKeys(payload, allowed);
  if (!picked) return { ok: false, reason: "disclosure_invalid" };
  if (surface !== "public_receipt" && surface !== "webhook_event") {
    const leaks = detectDisclosureLeaks(picked);
    if (leaks.length > 0) return { ok: false, reason: "disclosure_leak" };
  }
  return { ok: true, payload: picked };
}

export function failClosedDisclosureError(reason: string): { error: string } {
  if (reason === "client_override_rejected") return { error: "disclosure_rejected" };
  if (reason === "disclosure_leak") return { error: "unavailable" };
  return { error: "disclosure_unavailable" };
}
