// FILE: lib/passport/portableTrust/presentationBundle.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  assertPresentationExcludesSensitiveCustody,
  composeHolderPolicyScopedPresentation,
  type HolderPolicyScopedPresentation,
} from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import {
  HOLDER_PORTABLE_EXPORT_MEDIA_TYPE,
  HOLDER_PORTABLE_EXPORT_SCHEMA_VERSION,
  type HolderPortableCredentialSummary,
  type HolderPortablePresentationExport,
} from "./contract";
import {
  buildAssuranceLabels,
  LINKABLE_RECEIPT_FIELDS,
  PORTABILITY_LIMITATIONS,
  PORTABLE_TRUST_NOT_DISCLOSED,
  SELECTIVE_DISCLOSURE_HONESTY,
} from "./privacyDisclosure";

export function summarizeHolderPortableCredential(
  record: DecisionReceiptRecord,
): HolderPortableCredentialSummary {
  return {
    receipt_id: record.id,
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    decision_result: record.decision_result,
    status: record.status,
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at,
    issuer_refs: record.issuer_refs,
    assurance_labels: buildAssuranceLabels(record),
    audience_bound: true,
    recovery_note:
      "This file does not restore Passport login or re-issue identity documents. Keep your wallet and account recovery paths separate.",
  };
}

export function composeHolderPresentationForPartner(input: {
  record: DecisionReceiptRecord;
  audiencePartnerId: string;
}): { ok: true; presentation: HolderPolicyScopedPresentation } | { ok: false; code: string } {
  if (input.record.partner_id !== input.audiencePartnerId) {
    return { ok: false, code: "audience_partner_mismatch" };
  }
  if (input.record.decision_result !== "approved") {
    return { ok: false, code: "decision_not_approved" };
  }
  const presentation = composeHolderPolicyScopedPresentation({
    signedRecord: input.record,
    audiencePartnerId: input.audiencePartnerId,
  });
  const custody = assertPresentationExcludesSensitiveCustody(presentation);
  if (!custody.ok) return { ok: false, code: custody.reason };
  return { ok: true, presentation };
}

export function buildHolderPortableExport(input: {
  record: DecisionReceiptRecord;
  exportedAt?: Date;
}): { ok: true; bundle: HolderPortablePresentationExport } | { ok: false; code: string } {
  const composed = composeHolderPresentationForPartner({
    record: input.record,
    audiencePartnerId: input.record.partner_id,
  });
  if (!composed.ok) return composed;
  return {
    ok: true,
    bundle: {
      media_type: HOLDER_PORTABLE_EXPORT_MEDIA_TYPE,
      schema_version: HOLDER_PORTABLE_EXPORT_SCHEMA_VERSION,
      exported_at: (input.exportedAt ?? new Date()).toISOString(),
      presentation: composed.presentation,
      credential_summary: summarizeHolderPortableCredential(input.record),
      privacy: {
        linkable_fields: [...LINKABLE_RECEIPT_FIELDS],
        not_disclosed: [...PORTABLE_TRUST_NOT_DISCLOSED],
        selective_disclosure_honesty: SELECTIVE_DISCLOSURE_HONESTY,
      },
      portability_limits: [...PORTABILITY_LIMITATIONS],
    },
  };
}

export function parseHolderPortableImport(raw: unknown):
  | { ok: true; bundle: HolderPortablePresentationExport }
  | { ok: false; code: string } {
  if (!raw || typeof raw !== "object") return { ok: false, code: "invalid_json" };
  const bundle = raw as HolderPortablePresentationExport;
  if (bundle.media_type !== HOLDER_PORTABLE_EXPORT_MEDIA_TYPE) {
    return { ok: false, code: "unsupported_media_type" };
  }
  if (bundle.schema_version !== HOLDER_PORTABLE_EXPORT_SCHEMA_VERSION) {
    return { ok: false, code: "unsupported_schema_version" };
  }
  if (!bundle.presentation?.signed_decision_receipt?.signature) {
    return { ok: false, code: "missing_signed_receipt" };
  }
  const custody = assertPresentationExcludesSensitiveCustody(bundle.presentation);
  if (!custody.ok) return { ok: false, code: custody.reason };
  return { ok: true, bundle };
}
