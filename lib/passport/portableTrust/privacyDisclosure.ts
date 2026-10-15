// FILE: lib/passport/portableTrust/privacyDisclosure.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

export const LINKABLE_RECEIPT_FIELDS = [
  "receipt_id",
  "subject_pseudonym_id",
  "partner_id",
  "policy_id",
  "evaluated_claim_refs[].claim_id",
  "wallet_binding_ref (when present)",
] as const;

export const PORTABLE_TRUST_NOT_DISCLOSED = [
  "Legal name",
  "Government ID images",
  "Biometric templates",
  "Raw document bytes",
  "Issuer signing private keys",
] as const;

export const SELECTIVE_DISCLOSURE_HONESTY =
  "The signed decision receipt may still include metadata (receipt id, pseudonymous subject ref, claim identifiers, partner and policy ids). This is policy-scoped presentation, not zero-knowledge selective disclosure.";

export const PORTABILITY_LIMITATIONS = [
  "Each presentation is audience-bound to the partner that issued the authorization receipt.",
  "Reusing a receipt for a different partner will fail independent verification (wrong audience).",
  "Portable revocation snapshots must be authenticated separately; stale feeds fail closed.",
  "Export files do not restore Abraxas account access — they only carry signed authorization artifacts.",
  "Institutional pairwise pseudonyms may differ per partner application; there is no universal holder tracking id.",
] as const;

export function buildAssuranceLabels(record: DecisionReceiptRecord): string[] {
  const labels: string[] = [];
  if (record.decision_result === "approved") labels.push("Eligible under bound policy");
  for (const ref of record.evaluated_claim_refs) {
    labels.push(`${ref.claim_type.replace(/_/g, " ")} (${ref.status})`);
  }
  if (record.decision_context === "sandbox_only") labels.push("Sandbox demonstration only");
  return labels;
}
