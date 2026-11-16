// FILE: lib/privacy/auditorDisclosure/contract.ts
// Build 968 — purpose-bound auditor disclosure mandate (controlled fixture contract).

import type { SelectiveDisclosureSurface } from "@/lib/privacy/selectiveDisclosure/contract";

export const AUDITOR_DISCLOSURE_MANDATE_DOCUMENT = "abraxas_auditor_disclosure_mandate" as const;
export const AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION = "1.0.0" as const;

/** Keys with this reason_class may sign auditor disclosure mandates; auditor role alone is insufficient. */
export const INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS =
  "institutional_auditor_mandate_issuer" as const;

export const AUDITOR_DISCLOSURE_PURPOSES = [
  "regulatory_examination",
  "soc2_type2",
  "internal_compliance_review",
] as const;

export type AuditorDisclosurePurpose = (typeof AUDITOR_DISCLOSURE_PURPOSES)[number];

export type AuditorDisclosureResourceKind = "decision_receipt" | "verification_decision";

export type AuditorDisclosureMandatePayload = {
  document: typeof AUDITOR_DISCLOSURE_MANDATE_DOCUMENT;
  schema_version: typeof AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION;
  mandate_id: string;
  issuer_id: string;
  issuer_key_id: string;
  tenant_id: string;
  policy_id: string;
  policy_version: number;
  authorized_auditor_id: string;
  purpose: AuditorDisclosurePurpose;
  audience_hash: string;
  resource_ref: string;
  resource_kind: AuditorDisclosureResourceKind;
  disclosure_surface: Extract<SelectiveDisclosureSurface, "auditor_review">;
  not_before: string;
  not_after: string;
  revoked_at: string | null;
  environment: "demo" | "production";
  issued_at: string;
};

export type SignedAuditorDisclosureMandate = {
  payload: AuditorDisclosureMandatePayload;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
};

export const CONTROLLED_AUDITOR_MANDATE_ISSUER_FIXTURE_LABEL =
  "abraxas_controlled_test_auditor_mandate_issuer_not_live_institution" as const;

/** Extra fields that must never appear on auditor_review serialized output (stricter scan). */
export const AUDITOR_REVIEW_FORBIDDEN_FIELDS = [
  "legal_name",
  "name",
  "date_of_birth",
  "dob",
  "address",
  "passport",
  "document_number",
  "document_image",
  "selfie",
  "email",
  "phone",
  "provider_subject_ref",
  "provider_payload",
  "wallet",
  "wallet_address",
  "storage_path",
  "plaintext",
  "raw_evidence",
] as const;

export const AUDITOR_DISCLOSURE_PROFILE_NOTICE =
  "Auditor disclosure is an allowlisted serialization boundary on top of encrypted custody; it is not encryption and does not grant vault decrypt keys.";