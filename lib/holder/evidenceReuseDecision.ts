// Evidence reuse decision matrix — holder and partner flows (Build #511).

export type EvidenceReuseOutcome =
  | "reuse_without_recollection"
  | "collect_required_verification"
  | "refresh_expired_evidence"
  | "collect_additional_assurance"
  | "deny_revoked"
  | "request_consent_only";

export interface EvidenceReuseInput {
  hasQualifiedEvidence: boolean;
  evidenceExpired: boolean;
  evidenceRevoked: boolean;
  higherAssuranceRequired: boolean;
  consentGranted: boolean;
}

export interface EvidenceReuseDecision {
  outcome: EvidenceReuseOutcome;
  holderMessage: string;
  partnerMessage: string;
}

export function decideEvidenceReuse(input: EvidenceReuseInput): EvidenceReuseDecision {
  if (input.evidenceRevoked) {
    return {
      outcome: "deny_revoked",
      holderMessage: "Your previous verification is no longer valid. Start a new verification when a partner requires it.",
      partnerMessage: "Evidence revoked — holder must re-verify before eligibility can be decided.",
    };
  }
  if (input.evidenceExpired) {
    return {
      outcome: "refresh_expired_evidence",
      holderMessage: "Your verification expired. You only need to refresh what's required — not start from scratch unless policy requires it.",
      partnerMessage: "Evidence expired — refresh required before reuse.",
    };
  }
  if (input.higherAssuranceRequired) {
    return {
      outcome: "collect_additional_assurance",
      holderMessage: "This request needs a higher assurance level. You'll only provide what's missing.",
      partnerMessage: "Additional assurance required beyond current qualified evidence.",
    };
  }
  if (!input.hasQualifiedEvidence) {
    return {
      outcome: "collect_required_verification",
      holderMessage: "Complete identity verification once in your Passport. Partners then receive narrow results only.",
      partnerMessage: "No qualified evidence — holder verification required.",
    };
  }
  if (!input.consentGranted) {
    return {
      outcome: "request_consent_only",
      holderMessage: "Your verification can be reused. Review what will be shared and approve consent — no new documents needed.",
      partnerMessage: "Evidence qualifies — awaiting holder consent.",
    };
  }
  return {
    outcome: "reuse_without_recollection",
    holderMessage: "Your existing verification satisfies this request. Abraxas shares only the permitted narrow result.",
    partnerMessage: "Qualified evidence reused with fresh consent.",
  };
}
