// FILE: lib/protocol/proofFirst/presentationReceiptBinding.ts
// Strict binding — unsigned wrapper fields never override signed receipt authority.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES } from "@/lib/privacy/selectiveDisclosure/contract";
import {
  HOLDER_POLICY_PRESENTATION_MEDIA_TYPE,
  HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION,
  type HolderPolicyScopedPresentation,
} from "./holderPolicyPresentation";

export type PresentationBindingDenyCode =
  | "presentation_media_type_invalid"
  | "presentation_schema_invalid"
  | "presentation_policy_id_mismatch"
  | "presentation_policy_version_mismatch"
  | "presentation_audience_mismatch"
  | "presentation_claim_ref_unbound"
  | "presentation_claim_ref_empty"
  | "presentation_rp_policy_mismatch"
  | "presentation_rp_audience_mismatch"
  | "presentation_excluded_classes_mismatch";

export type PresentationReceiptBindingResult =
  | { ok: true }
  | { ok: false; deny_codes: PresentationBindingDenyCode[] };

/** Deterministic DENY if holder wrapper disagrees with signed issuer artifact or RP expectations. */
export function validatePresentationReceiptStrictBinding(input: {
  presentation: HolderPolicyScopedPresentation;
  relyingParty: { partnerId: string; policyId: string };
}): PresentationReceiptBindingResult {
  const deny: PresentationBindingDenyCode[] = [];
  const { presentation, relyingParty } = input;
  const signed = presentation.signed_decision_receipt;

  if (presentation.media_type !== HOLDER_POLICY_PRESENTATION_MEDIA_TYPE) {
    deny.push("presentation_media_type_invalid");
  }
  if (presentation.schema_version !== HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION) {
    deny.push("presentation_schema_invalid");
  }
  if (presentation.policy_id !== signed.policy_id) {
    deny.push("presentation_policy_id_mismatch");
  }
  if (presentation.policy_version !== signed.policy_version) {
    deny.push("presentation_policy_version_mismatch");
  }
  if (presentation.audience_partner_id !== signed.partner_id) {
    deny.push("presentation_audience_mismatch");
  }
  if (signed.partner_id !== relyingParty.partnerId) {
    deny.push("presentation_rp_audience_mismatch");
  }
  if (signed.policy_id !== relyingParty.policyId) {
    deny.push("presentation_rp_policy_mismatch");
  }

  const excludedOk =
    presentation.excluded_data_classes.length === SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES.length
    && presentation.excluded_data_classes.every(
      (v, i) => v === SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES[i],
    );
  if (!excludedOk) {
    deny.push("presentation_excluded_classes_mismatch");
  }

  if (!presentation.disclosed_claim_refs.length) {
    deny.push("presentation_claim_ref_empty");
  }
  const allowed = new Set(signed.evaluated_claim_refs.map((c) => c.claim_id));
  for (const id of presentation.disclosed_claim_refs) {
    if (!allowed.has(id)) {
      deny.push("presentation_claim_ref_unbound");
      break;
    }
  }

  return deny.length ? { ok: false, deny_codes: deny } : { ok: true };
}

export type SignedReceiptCorrelationField =
  | "receipt_id"
  | "subject_pseudonym_id"
  | "wallet_binding_ref"
  | "consent_receipt_id"
  | "verification_decision_id"
  | "evaluated_claim_refs.claim_id"
  | "issuer_refs";

export type SignedReceiptCorrelationAudit = {
  /** Fields present on canonical signed receipt that may enable correlation if shared widely. */
  present_fields: SignedReceiptCorrelationField[];
  /** Plain-language risks — not a privacy guarantee. */
  correlation_risks: string[];
  /** No raw PII field names detected in signed payload (heuristic). */
  no_obvious_pii_field_names: boolean;
};

const PII_NAME_PATTERNS = [
  "legal_name",
  "date_of_birth",
  "email",
  "passport",
  "wallet_address",
  "sui_address",
] as const;

/** Heuristic audit of signed receipt correlation surface (issuer-signed only). */
export function auditSignedReceiptCorrelationSurface(
  record: DecisionReceiptRecord,
): SignedReceiptCorrelationAudit {
  const present_fields: SignedReceiptCorrelationField[] = ["receipt_id"];
  if (record.subject_pseudonym_id) present_fields.push("subject_pseudonym_id");
  if (record.wallet_binding_ref) present_fields.push("wallet_binding_ref");
  if (record.consent_receipt_id) present_fields.push("consent_receipt_id");
  if (record.verification_decision_id) present_fields.push("verification_decision_id");
  if (record.evaluated_claim_refs?.length) present_fields.push("evaluated_claim_refs.claim_id");
  if (record.issuer_refs?.length) present_fields.push("issuer_refs");

  const blob = JSON.stringify(record);
  const no_obvious_pii_field_names = !PII_NAME_PATTERNS.some((p) => blob.includes(`"${p}"`));

  const correlation_risks: string[] = [];
  if (record.subject_pseudonym_id) {
    correlation_risks.push(
      "subject_pseudonym_id is stable across receipts from the same issuer — partners sharing receipts could correlate sessions unless rotated or scoped per audience.",
    );
  }
  if (record.wallet_binding_ref) {
    correlation_risks.push(
      "wallet_binding_ref links verification to wallet material — omit from partner bundles when policy allows (public view may withhold).",
    );
  }
  if (record.consent_receipt_id) {
    correlation_risks.push(
      "consent_receipt_id ties decisions to a consent event — useful for audit, correlatable if reused across partners.",
    );
  }
  correlation_risks.push(
    "receipt_id is a unique artifact identifier — relying parties should treat consumption/replay state as local, not publish receipt_id broadly.",
  );

  return { present_fields, correlation_risks, no_obvious_pii_field_names };
}
