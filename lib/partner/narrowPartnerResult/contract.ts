// FILE: lib/partner/narrowPartnerResult/contract.ts
// Public narrow partner result contract — authorized policy facts only.

import type { ProvenancePartnerFacts } from "@/lib/partner/provenancePartnerResult";

export const NARROW_PARTNER_RESULT_SCHEMA_VERSION = "1.0.0" as const;

export const NARROW_PARTNER_RESULT_FORBIDDEN_KEYS = [
  "artifact_id",
  "content_hash",
  "claim_value",
  "evaluated_claim_refs",
  "claims_json",
  "subject_id",
  "credential_jwt",
  "credential_id",
] as const;

export const NARROW_PARTNER_RESULT_ALLOWED_FIELDS = [
  "schema_version",
  "receipt_id",
  "policy_id",
  "partner_id",
  "decision",
  "result_family",
  "provenance",
  "over_21",
  "identity_verified",
  "assurance_level",
] as const;

export interface NarrowPartnerResult {
  schema_version: typeof NARROW_PARTNER_RESULT_SCHEMA_VERSION;
  receipt_id: string;
  policy_id: string;
  partner_id: string;
  decision: "approved" | "denied" | "manual_review";
  /** Catalog disclosed_result for the policy pack (e.g. content_origin_disclosed). */
  result_family: string;
  provenance?: ProvenancePartnerFacts;
  over_21?: boolean;
  identity_verified?: boolean;
  assurance_level?: string | null;
}

export const NARROW_PARTNER_RESULT_NOTICE =
  "Narrow partner results expose only policy-authorized facts derived from the signed receipt decision. They never include raw claims, artifact identifiers, or content hashes.";
