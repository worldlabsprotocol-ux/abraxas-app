// FILE: lib/organizationEligibility/contract.ts
// Private organization and authorized-signer eligibility. Not KYB storage or Utila.

import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";

export const ORGANIZATION_ELIGIBILITY_VERSION = "1.0.0" as const;
export const ORGANIZATION_ELIGIBILITY_DOCS = "/docs/organization-eligibility" as const;
export const ORGANIZATION_ELIGIBILITY_TTL_MS = 15 * 60 * 1000;

export const ORGANIZATION_RESULT_CATEGORIES = [
  "organization_eligible",
  "authorized_signer",
  "jurisdiction_eligible",
  "institutional_counterparty_eligible",
] as const;
export type OrganizationResultCategory = (typeof ORGANIZATION_RESULT_CATEGORIES)[number];

export const ORGANIZATION_STATUSES = ["issued", "expired", "revoked", "withdrawn"] as const;
export type OrganizationEligibilityStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_PUBLIC_RESULT_FIELDS = [
  "schema_version",
  "organization_ref",
  "actor_ref",
  "result_category",
  "result",
  "currently_valid",
  "policy_id",
  "policy_version",
  "action",
  "action_scope",
  "environment",
  "audience_hash",
  "issued_at",
  "expires_at",
  "subject_binding_hash",
  "selective_disclosure_summary",
] as const;

export const ORGANIZATION_PUBLIC_RESULTS = ["approved", "denied", "expired", "revoked"] as const;
export type OrganizationPublicResult = (typeof ORGANIZATION_PUBLIC_RESULTS)[number];

export const ORGANIZATION_ELIGIBILITY_NOTICE =
  "Abraxas returns a narrow audience-bound organization or authorized-signer result. Partners apply their own wallet governance, AML/KYT, quorum, and transaction rules. This is not document collection, a company database, sanctions screening, custody, or a live Utila integration.";

export const ORGANIZATION_NO_WALLET_KYB =
  "A wallet-control proof alone can never qualify as KYB or authorized-signer evidence.";

export const ORGANIZATION_UTILA_NOTICE =
  "Utila-compatible private result shapes only. There is no live Utila API, wallet product, AML/KYT, quorum, or transaction-policy integration.";

export const ORGANIZATION_FORBIDDEN_KEYS = [
  "legal_name",
  "company_name",
  "incorporation",
  "beneficial_owner",
  "ubo",
  "tax_id",
  "ein",
  "ssn",
  "address",
  "email",
  "kyb_evidence",
  "kyc_evidence",
  "raw_evidence",
  "provider_payload",
  "callback_url",
  "wallet_private_key",
  "private_key",
  "mnemonic",
] as const;

export const ORGANIZATION_CLIENT_OVERRIDE_KEYS = [
  "issuer",
  "provider",
  "organization",
  "signer_authority",
  "jurisdiction",
  "policy",
  "policy_id",
  "assurance",
  "extraction_field",
  "action",
  "chain",
  "deployment",
  "receipt",
  "receipt_id",
] as const;

export const ORGANIZATION_MIGRATION_FILE = "106_private_organization_eligibility.sql" as const;
export const ORGANIZATION_DEMO_SQL_EDITOR =
  `https://supabase.com/dashboard/project/${DEMO_SUPABASE_PROJECT_REF}/sql/new` as const;
