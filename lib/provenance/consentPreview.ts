// FILE: lib/provenance/consentPreview.ts
// Holder-facing plain language for provenance consent.

import { resolveProvenancePolicyPack } from "./policyPacks";
import { PROVENANCE_CLAIM_SEMANTICS } from "./claimSemantics";

export interface ProvenanceConsentPreview {
  partner_question: string;
  shared: string;
  not_shared: string[];
  assurance_note: string;
}

export function buildContentOriginConsentPreview(): ProvenanceConsentPreview {
  return {
    partner_question: "Your partner is asking about this content's origin and integrity.",
    shared: "creator attestation, AI assistance disclosure category, and fingerprint integrity result",
    not_shared: [
      "raw file bytes",
      "legal identity documents",
      "government ID",
      "email address",
      "account details",
      "AI probability scores",
      "detection verdicts",
      "internal artifact storage location",
    ],
    assurance_note:
      "Creator attestation is what you say. AI disclosure is what you declare — not a detector result. Integrity confirms this exact file matches the verified fingerprint.",
  };
}

export function buildProvenanceConsentPreview(packId: string): ProvenanceConsentPreview | null {
  if (packId === "content_origin_disclosure") {
    return buildContentOriginConsentPreview();
  }
  const pack = resolveProvenancePolicyPack(packId);
  if (!pack) return null;

  const semantics = PROVENANCE_CLAIM_SEMANTICS[pack.required_claim];

  return {
    partner_question: pack.question,
    shared: pack.disclosed_result.replace(/_/g, " "),
    not_shared: [
      "legal identity documents",
      "government ID",
      "email address",
      "raw source file",
      "unrelated Passport data",
      "device identity",
      "AI probability scores",
    ],
    assurance_note: semantics.establishes,
  };
}
