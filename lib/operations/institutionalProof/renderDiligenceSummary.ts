// FILE: lib/operations/institutionalProof/renderDiligenceSummary.ts
// Technical diligence summary generated from evidence — not marketing copy.

import type { InstitutionalReusableKycEvidencePacket } from "./contract";

export function renderInstitutionalDiligenceSummary(packet: InstitutionalReusableKycEvidencePacket): string {
  return [
    "## Institutional Reusable-KYC — Technical Diligence Summary",
    "",
    "**Problem tested:** Can one authenticated provider verification support a second relying application without raw KYC recollection, with distinct public pairwise identities and post-revocation reuse denial?",
    "",
    "**Architecture exercised:** Provider-neutral ingestion adapter, identity subject binding, trust-context policy evaluation, DecisionReceipt v1.0.0 with pairwise `subject_pseudonym_id`, reusable evidence graph, PartnerKit + public receipt + narrow result verification.",
    "",
    `**Observed result:** Provider verifications=${packet.funnel.provider_verifications}; application verifications=${packet.funnel.application_verifications}; reuse_count=${packet.funnel.reuse_count}; raw_kyc_recollections=${packet.funnel.raw_kyc_recollections}. Decision gate=${packet.decision_gate}.`,
    "",
    "**Privacy boundary:** Partner-visible surfaces scanned for forbidden PII/global identifiers. Forbidden field count=" + packet.privacy.forbidden_field_count + ". Pairwise isolation=" + packet.pairwise.cross_application_pairwise_distinct + ".",
    "",
    "**Revocation behavior:** Revocation authenticated=" + packet.revocation.revocation_event_authenticated + "; reuse after revocation=" + packet.reuse.reuse_after_revocation + ".",
    "",
    "**Integration boundary:** External consumer uses PartnerKit, public receipt validation, and narrow result only — no Supabase admin or internal DB services.",
    "",
    "**Limitations:** " + packet.limitations.slice(0, 3).join(" "),
    "",
    `**Environment:** ${packet.environment} — not production evidence unless explicitly verified in readiness section (status=${packet.readiness.status}).`,
  ].join("\n");
}
