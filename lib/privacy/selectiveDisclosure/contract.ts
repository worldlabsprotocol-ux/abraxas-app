// FILE: lib/privacy/selectiveDisclosure/contract.ts
// Canonical selective-disclosure boundary. Catalog is authoritative. Not a second policy engine.

import { POLICY_PACK_CATALOG_VERSION, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import { PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS } from "@/lib/partner/integrationKit/contract";
import { WEBHOOK_PAYLOAD_ALLOWED_KEYS } from "@/lib/partner/webhooks/payloadAllowlist";
import { PORTABLE_ACTION_CLIENT_VISIBLE_KEYS } from "@/lib/partner/portableActionContract/contract";
import { TRADING_VENUE_CLIENT_VISIBLE_KEYS } from "@/lib/partner/tradingVenue/contract";
import { PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS } from "@/lib/partner/paymentAuthorization/contract";
import { PASSPORT_ACTIVITY_CLIENT_ITEM_KEYS } from "@/lib/passport/verificationActivity/contract";

export const SELECTIVE_DISCLOSURE_VERSION = "1.0.0" as const;

export const SELECTIVE_DISCLOSURE_SURFACES = [
  "holder_brief",
  "consent_preview",
  "public_receipt",
  "partner_kit",
  "webhook_event",
  "passport_activity",
  "launchpad_summary",
  "action_contract",
] as const;
export type SelectiveDisclosureSurface = (typeof SELECTIVE_DISCLOSURE_SURFACES)[number];

export const SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES = [
  "raw_evidence",
  "biometric",
  "identity_profile",
  "wallet_material",
  "receipt_crypto",
  "oauth_session",
  "provider_payload",
  "raw_errors",
  "policy_internals",
] as const;
export type SelectiveDisclosureForbiddenClass = (typeof SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES)[number];

export const SELECTIVE_DISCLOSURE_CLIENT_OVERRIDE_KEYS = [
  "disclosure_profile",
  "claim_allowlist",
  "withheld_override",
  "allowed_fields",
  "policy_version",
  "environment",
  "receipt",
  "receipt_id",
  "api_key",
  "callback",
  "approval",
  "activate_production",
  "issue_production_key",
] as const;

export const HOLDER_BRIEF_ALLOWED_FIELDS = [
  "requestor",
  "purpose",
  "result",
  "shared_result_category",
  "withheld",
  "environment_label",
  "environment_detail",
  "method_explanation",
  "google_account_only",
  "identity_not_default",
] as const;

export const CONSENT_PREVIEW_ALLOWED_FIELDS = [
  "request_id",
  "partner_id",
  "policy_id",
  "purpose",
  "policy_name",
  "requested_action",
  "requested_claims",
  "claim_labels",
  "never_shared",
  "expires_at",
  "status",
  "shared_result_category",
  "sandbox_only",
] as const;

export const PLANNER_ALLOWED_OUTPUT_FIELDS = [
  "decision_result",
  "status",
  "currently_valid",
  "production_usable",
  "decision_context",
  "artifact_type",
] as const;

export const PUBLIC_RECEIPT_ALLOWED_FIELDS = [
  ...PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS,
  "evaluated_claim_refs",
  "issuer_refs",
  "reason_codes",
  "evaluated_at",
  "payload_hash",
  "signature",
  "signing_key_id",
  "anchor_reference",
  "subject_pseudonym_id",
  "validity",
  "invalidation_reasons",
] as const;

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

export const LAUNCHPAD_SUMMARY_ALLOWED_FIELDS = [
  "status",
  "outcome",
  "reason_code",
  "sandbox_only",
  "production_usable",
  "result_category",
] as const;

export const SELECTIVE_DISCLOSURE_NOTICE =
  "Abraxas shares a policy result, not the underlying evidence. This is enforced selective disclosure from the catalog, not a zero-knowledge proof system.";

export const SELECTIVE_DISCLOSURE_CRYPTOGRAPHY_NOTICE =
  "Enforced selective disclosure today is an allowlist and redaction boundary on server serializers. Advanced cryptographic proof systems are a future path and are not claimed here.";

export interface SelectiveDisclosureProfile {
  pack_id: PolicyPackId;
  catalog_version: number;
  result_category: string;
  partner_visible_result: string;
  withheld: readonly string[];
  sandbox_only: boolean;
  production_use: "sandbox_only" | "reviewed_production";
  public_receipt_fields: readonly string[];
  partner_kit_fields: readonly string[];
  webhook_fields: readonly string[];
  holder_brief_fields: readonly string[];
  consent_fields: readonly string[];
  passport_activity_fields: readonly string[];
  action_contract_fields: readonly string[];
  trading_action_fields: readonly string[];
  payment_action_fields: readonly string[];
  launchpad_summary_fields: readonly string[];
  forbidden_classes: readonly SelectiveDisclosureForbiddenClass[];
}

export const SHARED_SURFACE_FIELDS = {
  public_receipt: PUBLIC_RECEIPT_ALLOWED_FIELDS,
  partner_kit: PARTNER_KIT_ALLOWED_FIELDS,
  webhook_event: WEBHOOK_PAYLOAD_ALLOWED_KEYS,
  holder_brief: HOLDER_BRIEF_ALLOWED_FIELDS,
  consent_preview: CONSENT_PREVIEW_ALLOWED_FIELDS,
  passport_activity: PASSPORT_ACTIVITY_CLIENT_ITEM_KEYS,
  action_contract: PORTABLE_ACTION_CLIENT_VISIBLE_KEYS,
  trading_action: TRADING_VENUE_CLIENT_VISIBLE_KEYS,
  payment_action: PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS,
  launchpad_summary: LAUNCHPAD_SUMMARY_ALLOWED_FIELDS,
} as const;

export const DISCLOSURE_CATALOG_VERSION = POLICY_PACK_CATALOG_VERSION;
