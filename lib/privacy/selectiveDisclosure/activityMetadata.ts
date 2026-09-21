// FILE: lib/privacy/selectiveDisclosure/activityMetadata.ts
// Write-time allowlist for Launchpad activity metadata. UI redaction is not enough.

import { detectDisclosureLeaks } from "./leakDetector";

export const LAUNCHPAD_ACTIVITY_METADATA_ALLOWED_KEYS = [
  "purpose",
  "action",
  "callback_ref",
  "callback_index",
  "capabilities",
  "display_label",
  "scenario",
  "simulated",
  "harness",
  "passed",
  "source",
  "policy_template_id",
  "policy_id",
  "policy_version",
  "idempotency_replay",
  "correlation_id",
  "key_prefix",
  "request_id",
  "sandbox_readiness",
  "stage",
  "status",
  "code",
  "label",
  "duplicate",
  "production_usable",
  "issues_production_receipt",
  "idempotency_key",
  "settlement",
  "state",
  "activates_production",
  "funds_moved",
  "readiness_class",
  "callback_class",
  "kit_evidenced",
  "sandbox_key_configured",
  "reason_class",
  "issues_production_key",
  "credential_state",
  "starter_kit",
  "action_family",
  "probe",
  "proposal_ref",
  "lifecycle",
  "candidate_ref",
] as const;

const FORBIDDEN_ACTIVITY_KEYS = [
  "callback_url",
  "return_url",
  "return",
  "consent_url",
  "receipt_id",
  "receipt",
  "payload_hash",
  "signature",
  "wallet_address",
  "sui_address",
  "public_key",
  "legal_name",
  "email",
  "date_of_birth",
  "oauth_token",
  "id_token",
  "credential_jwt",
  "provider_payload",
  "rules_json",
  "claims_json",
  "error",
  "stack",
  "sqlstate",
] as const;

function scalarAllowed(value: unknown): value is string | number | boolean | null {
  if (value == null) return true;
  const type = typeof value;
  return type === "string" || type === "number" || type === "boolean";
}

function valueLooksSensitive(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (/https?:\/\//i.test(value)) return true;
  if (detectDisclosureLeaks({ v: value }).length > 0) return true;
  return false;
}

export function sanitizeLaunchpadActivityMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean | null> {
  const source = metadata ?? {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of LAUNCHPAD_ACTIVITY_METADATA_ALLOWED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if ((FORBIDDEN_ACTIVITY_KEYS as readonly string[]).includes(key)) continue;
    const value = source[key];
    if (!scalarAllowed(value)) continue;
    if (valueLooksSensitive(value)) continue;
    out[key] = value;
  }
  return out;
}

export function projectLaunchpadActivityEvent(row: {
  id?: unknown;
  event_type?: unknown;
  public_code?: unknown;
  metadata?: unknown;
  created_at?: unknown;
}): {
  id: string | null;
  event_type: string | null;
  public_code: string | null;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string | null;
} {
  const metadata = sanitizeLaunchpadActivityMetadata(
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {},
  );
  return {
    id: typeof row.id === "string" ? row.id : null,
    event_type: typeof row.event_type === "string" ? row.event_type : null,
    public_code: typeof row.public_code === "string" ? row.public_code : null,
    metadata,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}
