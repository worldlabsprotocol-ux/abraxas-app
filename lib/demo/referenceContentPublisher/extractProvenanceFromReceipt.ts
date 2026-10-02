// FILE: lib/demo/referenceContentPublisher/extractProvenanceFromReceipt.ts
// Map public receipt claim refs to narrow provenance facts.

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { ProvenancePartnerFacts } from "@/lib/partner/provenancePartnerResult";

export function extractProvenanceFromPublicReceipt(
  receipt: PartnerFlowPublicReceipt,
): ProvenancePartnerFacts | null {
  const refs = receipt.evaluated_claim_refs ?? [];
  const claimTypes = new Set(refs.map((ref) => ref.claim_type));

  if (
    !claimTypes.has("creator_attested")
    || !claimTypes.has("ai_assistance_disclosed")
    || !claimTypes.has("source_integrity_verified")
  ) {
    return null;
  }

  const aiRef = refs.find((ref) => ref.claim_type === "ai_assistance_disclosed");
  const aiCategory = typeof aiRef?.claim_id === "string" ? aiRef.claim_id : null;

  return {
    creator_attested: true,
    ai_assistance_disclosed: aiCategory ?? "none_declared",
    source_integrity_verified: true,
    assertion_classes: {
      creator_attested: "attestation",
      ai_assistance_disclosed: "disclosure",
      source_integrity_verified: "integrity",
    },
  };
}
