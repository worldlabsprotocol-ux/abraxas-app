// FILE: lib/decisionReceipts/evidenceIntegrityContract.ts
// Minimum evidence properties before a reuse backed decision (storage agnostic).

export type EvidenceIntegrityVerdict = "accepted" | "denied" | "indeterminate";

export type EvidenceSourceSnapshot = {
  source_credential_id: string;
  status: "active" | "revoked" | "expired";
  expires_at: string | null;
  revoked_at: string | null;
};

export type EvidenceClaimSnapshot = {
  claim_id: string;
  status: "active" | "revoked" | "expired" | "suspended";
  expires_at: string | null;
};

export type EvidenceIntegrityInput = {
  receipt_id: string;
  subject_pseudonym_id: string;
  expected_subject_pseudonym_id: string;
  partner_id: string;
  policy_id: string;
  source: EvidenceSourceSnapshot | null;
  claims: EvidenceClaimSnapshot[];
  store_available: boolean;
};

const DENY = new Set([
  "subject_mismatch",
  "source_evidence_missing",
  "source_evidence_revoked",
  "source_evidence_expired",
  "claim_missing",
  "claim_revoked",
  "claim_expired",
  "validity_store_unavailable",
]);

export function deriveEvidenceIntegrityVerdict(
  input: EvidenceIntegrityInput,
  now = new Date(),
): { verdict: EvidenceIntegrityVerdict; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.store_available) {
    return { verdict: "indeterminate", reasons: ["validity_store_unavailable"] };
  }
  if (input.expected_subject_pseudonym_id !== input.subject_pseudonym_id) {
    reasons.push("subject_mismatch");
  }
  if (!input.source) {
    reasons.push("source_evidence_missing");
  } else {
    if (input.source.status === "revoked" || input.source.revoked_at) {
      reasons.push("source_evidence_revoked");
    }
    if (
      input.source.status === "expired"
      || (input.source.expires_at && Date.parse(input.source.expires_at) <= now.getTime())
    ) {
      reasons.push("source_evidence_expired");
    }
  }
  for (const claim of input.claims) {
    if (claim.status === "revoked" || claim.status === "suspended") {
      reasons.push("claim_revoked");
    }
    if (
      claim.status === "expired"
      || (claim.expires_at && Date.parse(claim.expires_at) <= now.getTime())
    ) {
      reasons.push("claim_expired");
    }
  }
  if (reasons.some((r) => DENY.has(r))) {
    return { verdict: "denied", reasons: Array.from(new Set(reasons)) };
  }
  if (input.claims.length === 0) {
    return { verdict: "indeterminate", reasons: ["claim_missing"] };
  }
  return { verdict: "accepted", reasons: [] };
}
