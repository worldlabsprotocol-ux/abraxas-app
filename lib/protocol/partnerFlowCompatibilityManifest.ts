// FILE: lib/protocol/partnerFlowCompatibilityManifest.ts
// Canonical versioned compatibility manifest for external Partner Flow integrations.
// Single source of truth — public JSON is generated from this module at request time.

import { SITE_URL } from "@/lib/siteUrl";
import {
  COMPATIBILITY_POLICY,
  DECISION_RECEIPT_SCHEMA_VERSION,
  FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS,
  FROZEN_PARTNER_VERIFICATION_RESULT_KEYS,
  FROZEN_PUBLIC_RECEIPT_VIEW_KEYS,
  FROZEN_TRUST_DECISION_KEYS,
  FROZEN_TRUST_DECISION_PROOF_KEYS,
  PARTNER_CALLBACK_PARAMS,
  PARTNER_FLOW_RESPONSE_FIELDS,
  PUBLIC_RECEIPT_VIEW_FIELDS,
  TRUST_DECISION_API_VERSION,
} from "@/lib/protocol/compatibility";
import {
  PARTNER_FLOW_DOCUMENTED_OPERATIONS,
  PARTNER_FLOW_EXCLUDED_OPERATIONS,
  PARTNER_FLOW_OPENAPI_CANONICAL_URL,
  PARTNER_FLOW_RECEIPT_VALIDATION_RULES,
} from "@/lib/partner/partnerFlowOpenApiContract";
import { PARTNER_FLOW_SAFE_ERROR_CODES } from "@/lib/partner/partnerFlowAuditContract";
import { PARTNER_FLOW_ERROR_TABLE } from "@/lib/partner/partnerFlowIntegratorKit";
import type { PartnerFlowNextStep } from "@/lib/partner/relyingPartyFlow";

/** Bump when any frozen Partner Flow surface in this manifest changes semantics or shape. */
export const PARTNER_FLOW_COMPATIBILITY_VERSION = "1.0.0";

export const PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH = "/api/protocol/compatibility";

export const PARTNER_FLOW_FROZEN_NEXT_STEPS: readonly PartnerFlowNextStep[] = [
  "authenticate",
  "passport",
  "enter",
  "denied",
  "pending_review",
] as const;

/** Stable receipt invalidation reason prefixes returned by public receipt trust evaluation. */
export const FROZEN_RECEIPT_INVALIDATION_REASON_PREFIXES = [
  "receipt_missing",
  "signature_invalid",
  "receipt_revoked",
  "status_not_active",
  "expires_at_missing",
  "expires_at_invalid",
  "receipt_expired",
  "sandbox_only_not_production_usable",
  "decision_not_approved",
  "partner_mismatch",
  "policy_mismatch",
  "production_not_usable",
] as const;

/** Frozen Partner Flow browser JSON API paths (evaluate / complete / refresh). */
export const FROZEN_PARTNER_FLOW_BROWSER_API_PATHS = [
  "/api/v1/partner-flow/evaluate",
  "/api/v1/partner-flow/complete",
  "/api/v1/partner-flow/refresh",
] as const;

export const FROZEN_PARTNER_FLOW_BROWSER_ENTRY_PATH = "/partner/verify";

export const FROZEN_PARTNER_FLOW_PUBLIC_RECEIPT_PATH = "/api/receipts/{receiptId}/public";

export const PARTNER_FLOW_CALLBACK_NO_PII_RULE =
  "Callback query parameters must not contain legal name, date of birth, document numbers, images, wallet address, email, or credential JWT. Partners must verify via GET /api/receipts/{receiptId}/public — never trust callback parameters alone.";

export const PARTNER_FLOW_INTENTIONAL_EXCLUSIONS = [
  "Internal admin APIs (/api/admin/*)",
  "OAuth / zkLogin session internals",
  "Server-to-server verification-requests API (partner API key)",
  "Partner-authenticated receipt views (/api/v1/receipts/*)",
  "Abraxas Connect (/api/v1/authorize/*)",
  "Credential/registry verify (/api/credentials/verify)",
  "Sandbox-only policy behavior unless production_usable is explicitly opted in",
] as const;

export interface PartnerFlowCompatibilityManifest {
  compatibility_version: string;
  schema_versions: {
    decision_receipt: string;
    trust_decision_api: string;
  };
  canonical_origin: string;
  manifest_url: string;
  openapi_url: string;
  change_policy: typeof COMPATIBILITY_POLICY & {
    partner_flow_compatibility_version: string;
    breaking_change_process: readonly string[];
  };
  browser_paths: {
    entry: string;
    passport_handoff: string;
    evaluate: string;
    complete: string;
    refresh: string;
    public_receipt: string;
  };
  callback: {
    query_parameters: readonly string[];
    no_pii_rule: string;
    forbidden_query_keys: readonly string[];
  };
  partner_flow_response: {
    next_values: readonly PartnerFlowNextStep[];
    response_fields: readonly string[];
    evaluate_enter_keys: readonly string[];
    partner_result_keys: readonly string[];
  };
  public_receipt: {
    required_view_fields: readonly string[];
    frozen_view_fields: readonly string[];
    validation_rules: typeof PARTNER_FLOW_RECEIPT_VALIDATION_RULES;
    invalidation_reason_prefixes: readonly string[];
  };
  trust_decision_api: {
    frozen_field_keys: readonly string[];
    frozen_proof_keys: readonly string[];
  };
  stable_error_codes: {
    audit_safe_codes: readonly string[];
    http_conditions: typeof PARTNER_FLOW_ERROR_TABLE;
  };
  documented_operations: typeof PARTNER_FLOW_DOCUMENTED_OPERATIONS;
  excluded_from_public_guarantee: typeof PARTNER_FLOW_EXCLUDED_OPERATIONS;
  intentional_exclusions: typeof PARTNER_FLOW_INTENTIONAL_EXCLUSIONS;
}

export function buildPartnerFlowCompatibilityManifest(
  origin: string = SITE_URL,
): PartnerFlowCompatibilityManifest {
  const base = origin.replace(/\/$/, "");
  return {
    compatibility_version: PARTNER_FLOW_COMPATIBILITY_VERSION,
    schema_versions: {
      decision_receipt: DECISION_RECEIPT_SCHEMA_VERSION,
      trust_decision_api: TRUST_DECISION_API_VERSION,
    },
    canonical_origin: SITE_URL,
    manifest_url: `${base}${PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH}`,
    openapi_url: PARTNER_FLOW_OPENAPI_CANONICAL_URL,
    change_policy: {
      ...COMPATIBILITY_POLICY,
      partner_flow_compatibility_version: PARTNER_FLOW_COMPATIBILITY_VERSION,
      breaking_change_process: [
        "Bump PARTNER_FLOW_COMPATIBILITY_VERSION in lib/protocol/partnerFlowCompatibilityManifest.ts",
        "Update docs/PROTOCOL_COMPATIBILITY.md with migration notes",
        "Run lib/protocol/partnerFlowCompatibilityManifest.test.ts and lib/protocol/compatibility.test.ts",
        "Breaking semantic changes require a major repository tag (e.g. v2.0.0)",
      ],
    },
    browser_paths: {
      entry: FROZEN_PARTNER_FLOW_BROWSER_ENTRY_PATH,
      passport_handoff: "/passport",
      evaluate: FROZEN_PARTNER_FLOW_BROWSER_API_PATHS[0],
      complete: FROZEN_PARTNER_FLOW_BROWSER_API_PATHS[1],
      refresh: FROZEN_PARTNER_FLOW_BROWSER_API_PATHS[2],
      public_receipt: FROZEN_PARTNER_FLOW_PUBLIC_RECEIPT_PATH,
    },
    callback: {
      query_parameters: [...PARTNER_CALLBACK_PARAMS],
      no_pii_rule: PARTNER_FLOW_CALLBACK_NO_PII_RULE,
      forbidden_query_keys: [
        "email",
        "date_of_birth",
        "dob",
        "document_number",
        "wallet_address",
        "sui_address",
        "credential_jwt",
        "legal_name",
      ],
    },
    partner_flow_response: {
      next_values: [...PARTNER_FLOW_FROZEN_NEXT_STEPS],
      response_fields: [...PARTNER_FLOW_RESPONSE_FIELDS],
      evaluate_enter_keys: [...FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS],
      partner_result_keys: [...FROZEN_PARTNER_VERIFICATION_RESULT_KEYS],
    },
    public_receipt: {
      required_view_fields: [...PARTNER_FLOW_RECEIPT_VALIDATION_RULES.map(r => r.field)],
      frozen_view_fields: [...FROZEN_PUBLIC_RECEIPT_VIEW_KEYS],
      validation_rules: PARTNER_FLOW_RECEIPT_VALIDATION_RULES,
      invalidation_reason_prefixes: [...FROZEN_RECEIPT_INVALIDATION_REASON_PREFIXES],
    },
    trust_decision_api: {
      frozen_field_keys: [...FROZEN_TRUST_DECISION_KEYS],
      frozen_proof_keys: [...FROZEN_TRUST_DECISION_PROOF_KEYS],
    },
    stable_error_codes: {
      audit_safe_codes: [...PARTNER_FLOW_SAFE_ERROR_CODES],
      http_conditions: PARTNER_FLOW_ERROR_TABLE,
    },
    documented_operations: PARTNER_FLOW_DOCUMENTED_OPERATIONS,
    excluded_from_public_guarantee: PARTNER_FLOW_EXCLUDED_OPERATIONS,
    intentional_exclusions: PARTNER_FLOW_INTENTIONAL_EXCLUSIONS,
  };
}

/** Assert manifest public receipt fields stay aligned with compatibility constants. */
export function assertManifestSynchronizedWithImplementation(
  manifest: PartnerFlowCompatibilityManifest = buildPartnerFlowCompatibilityManifest(),
): void {
  if (manifest.compatibility_version !== PARTNER_FLOW_COMPATIBILITY_VERSION) {
    throw new Error("manifest compatibility_version drift — bump PARTNER_FLOW_COMPATIBILITY_VERSION intentionally");
  }
  if (manifest.callback.query_parameters.join() !== PARTNER_CALLBACK_PARAMS.join()) {
    throw new Error("callback query_parameters drift — bump compatibility version");
  }
  if (manifest.public_receipt.frozen_view_fields.join() !== FROZEN_PUBLIC_RECEIPT_VIEW_KEYS.join()) {
    throw new Error("public receipt frozen_view_fields drift — bump compatibility version");
  }
  if (manifest.partner_flow_response.evaluate_enter_keys.join() !== FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS.join()) {
    throw new Error("evaluate enter keys drift — bump compatibility version");
  }
  if (manifest.canonical_origin !== SITE_URL) {
    throw new Error("canonical_origin drift — bump compatibility version");
  }
  const subset = PUBLIC_RECEIPT_VIEW_FIELDS.every(f =>
    manifest.public_receipt.frozen_view_fields.includes(f as typeof FROZEN_PUBLIC_RECEIPT_VIEW_KEYS[number]),
  );
  if (!subset) {
    throw new Error("PUBLIC_RECEIPT_VIEW_FIELDS must remain subset of frozen public receipt view");
  }
}
