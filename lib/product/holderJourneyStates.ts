// Build #519 — plain-English holder states (maps to existing recovery + verify phases).

export type HolderJourneyStateId =
  | "first_time"
  | "returning"
  | "wallet_connected_unverified"
  | "verification_submitted"
  | "under_review"
  | "approved_evidence"
  | "additional_evidence_required"
  | "evidence_expired"
  | "evidence_revoked"
  | "consent_pending"
  | "consent_denied"
  | "receipt_issued"
  | "partner_return_pending"
  | "partner_completed";

export interface HolderJourneyStateCopy {
  id: HolderJourneyStateId;
  title: string;
  explanation: string;
  primaryAction: string;
}

export const HOLDER_JOURNEY_STATES: Record<HolderJourneyStateId, HolderJourneyStateCopy> = {
  first_time: {
    id: "first_time",
    title: "Welcome to Abraxas Passport",
    explanation: "Connect your wallet or sign in, then complete only the verification this policy requires.",
    primaryAction: "Connect wallet or open Passport",
  },
  returning: {
    id: "returning",
    title: "Welcome back",
    explanation: "Abraxas checks whether your existing evidence still qualifies before asking again.",
    primaryAction: "Review this partner request",
  },
  wallet_connected_unverified: {
    id: "wallet_connected_unverified",
    title: "Wallet connected — verification still required",
    explanation: "Wallet control proves you hold the keys, not your age or government identity.",
    primaryAction: "Complete identity verification in Passport",
  },
  verification_submitted: {
    id: "verification_submitted",
    title: "Verification submitted",
    explanation: "Your documents are with Abraxas for review. You can leave and return using the same partner link.",
    primaryAction: "Wait for review or check Passport status",
  },
  under_review: {
    id: "under_review",
    title: "Under review",
    explanation: "A human or automated review is in progress. Nothing is shared with the partner until approved.",
    primaryAction: "Check back soon or open Passport",
  },
  approved_evidence: {
    id: "approved_evidence",
    title: "Qualifying evidence on file",
    explanation: "You may reuse this evidence when policy, freshness, and consent allow.",
    primaryAction: "Continue to consent for this request",
  },
  additional_evidence_required: {
    id: "additional_evidence_required",
    title: "More verification needed",
    explanation: "This policy needs fresher or stronger evidence than you have on file. Abraxas explains exactly why.",
    primaryAction: "Complete the required verification step",
  },
  evidence_expired: {
    id: "evidence_expired",
    title: "Evidence expired",
    explanation: "Your previous verification is too old for this policy. Re-verify only what is required.",
    primaryAction: "Refresh verification in Passport",
  },
  evidence_revoked: {
    id: "evidence_revoked",
    title: "Evidence no longer valid",
    explanation: "A prior result was revoked or superseded. Start a new qualifying path if you still need access.",
    primaryAction: "Re-verify or contact support",
  },
  consent_pending: {
    id: "consent_pending",
    title: "Consent required",
    explanation: "Review who receives what before Abraxas shares an eligibility answer.",
    primaryAction: "Review and approve consent",
  },
  consent_denied: {
    id: "consent_denied",
    title: "Nothing was shared",
    explanation: "You declined consent or Abraxas could not approve the request. The partner did not receive an answer.",
    primaryAction: "Return to the partner or try again",
  },
  receipt_issued: {
    id: "receipt_issued",
    title: "Confirmation issued",
    explanation: "A signed receipt records what was checked and what answer was shared.",
    primaryAction: "Return to the partner application",
  },
  partner_return_pending: {
    id: "partner_return_pending",
    title: "Returning you to the partner",
    explanation: "Keep this tab open while Abraxas sends you back with your result.",
    primaryAction: "Wait for redirect",
  },
  partner_completed: {
    id: "partner_completed",
    title: "Request complete",
    explanation: "You can close this tab or view confirmations in Passport activity.",
    primaryAction: "Open Passport confirmations",
  },
};
