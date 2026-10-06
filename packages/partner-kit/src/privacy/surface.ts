export const PARTNER_KIT_ALLOWED_FIELDS = [
  "kit_version",
  "outcome",
  "action",
  "errors",
  "receipt_id",
  "decision_result",
  "status",
  "policy_id",
  "partner_id",
  "production_usable",
  "callback_trusted",
  "google_sign_in_is_not_eligibility",
  "replay_behavior",
] as const;

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
  return value;
}

export function safeCallbackClientErrors(errors: readonly string[]): string[] {
  const out = new Set<string>();
  for (const error of errors) {
    if (error === "receipt_id_missing") {
      out.add("receipt_id_missing");
      continue;
    }
    if (error.startsWith("pii_in_callback") || error.startsWith("unknown_callback_param")) {
      out.add("callback_untrusted");
      continue;
    }
    out.add(error.split(":")[0] ?? error);
  }
  return Array.from(out);
}

export const SHARED_SURFACE_FIELDS = {
  partner_kit: PARTNER_KIT_ALLOWED_FIELDS,
} as const;
