// FILE: lib/protocol/proofFirst/holderPolicyPresentation.ts
// Holder-controlled, policy-scoped presentation — signed receipt + claim refs only.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES } from "@/lib/privacy/selectiveDisclosure/contract";

export const HOLDER_POLICY_PRESENTATION_MEDIA_TYPE =
  "application/vnd.abraxas.policy-scoped-presentation+json" as const;

export const HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION = "1.0.0" as const;

export type HolderPolicyScopedPresentation = {
  media_type: typeof HOLDER_POLICY_PRESENTATION_MEDIA_TYPE;
  schema_version: typeof HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION;
  /** Full signed artifact the holder received from the issuer — no Abraxas fetch required at RP. */
  signed_decision_receipt: DecisionReceiptRecord;
  policy_id: string;
  policy_version: number;
  audience_partner_id: string;
  /** Claim identifiers disclosed for this presentation (metadata only). */
  disclosed_claim_refs: string[];
  /** Explicit negative guarantee for integrators. */
  excluded_data_classes: typeof SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES;
};

const FORBIDDEN_TOP_LEVEL_KEYS = [
  "document",
  "biometric",
  "legal_name",
  "date_of_birth",
  "selfie",
  "passport_image",
  "raw_evidence",
] as const;

export function composeHolderPolicyScopedPresentation(input: {
  signedRecord: DecisionReceiptRecord;
  audiencePartnerId: string;
  disclosedClaimIds?: string[];
}): HolderPolicyScopedPresentation {
  const claimIds =
    input.disclosedClaimIds
    ?? input.signedRecord.evaluated_claim_refs.map((c) => c.claim_id);
  return {
    media_type: HOLDER_POLICY_PRESENTATION_MEDIA_TYPE,
    schema_version: HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION,
    signed_decision_receipt: input.signedRecord,
    policy_id: input.signedRecord.policy_id,
    policy_version: input.signedRecord.policy_version,
    audience_partner_id: input.audiencePartnerId,
    disclosed_claim_refs: claimIds,
    excluded_data_classes: SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES,
  };
}

function recordContainsForbiddenEvidenceFields(record: DecisionReceiptRecord): string | null {
  const blob = JSON.stringify(record);
  for (const key of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (blob.includes(`"${key}"`)) return key;
  }
  for (const claim of record.evaluated_claim_refs) {
    if (claim.claim_type.includes("document") || claim.claim_type.includes("biometric")) {
      return "raw_claim_type";
    }
  }
  return null;
}

/** Ensures holder bundle does not smuggle custody artifacts to the RP. */
export function assertPresentationExcludesSensitiveCustody(
  presentation: HolderPolicyScopedPresentation,
): { ok: true } | { ok: false; reason: string } {
  const forbidden = recordContainsForbiddenEvidenceFields(presentation.signed_decision_receipt);
  if (forbidden) {
    return { ok: false, reason: `forbidden_field_leak:${forbidden}` };
  }
  if (presentation.disclosed_claim_refs.length === 0) {
    return { ok: false, reason: "no_claims_disclosed" };
  }
  const allowed = new Set(presentation.signed_decision_receipt.evaluated_claim_refs.map((c) => c.claim_id));
  for (const id of presentation.disclosed_claim_refs) {
    if (!allowed.has(id)) {
      return { ok: false, reason: "credential_substitution_claim" };
    }
  }
  if (presentation.signed_decision_receipt.partner_id !== presentation.audience_partner_id) {
    return { ok: false, reason: "audience_mismatch_at_compose" };
  }
  return { ok: true };
}
