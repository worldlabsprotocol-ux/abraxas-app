// Build #520 — map authoritative partner/passport signals to holderJourneyStates catalog.

import {
  HOLDER_JOURNEY_STATES,
  type HolderJourneyStateCopy,
  type HolderJourneyStateId,
} from "@/lib/product/holderJourneyStates";

export type PartnerFlowPhaseLite =
  | "loading"
  | "bootstrapping"
  | "sign_in"
  | "signing_in"
  | "preparing"
  | "verifying"
  | "returning"
  | "pending_review"
  | "denied"
  | "error"
  | "invalid_link"
  | "return_failed"
  | "expired"
  | "missing"
  | "cancelled"
  | "invalid_binding"
  | "method_not_qualified"
  | "provider_unavailable"
  | "approved";

export type HolderJourneyResolveInput = {
  signedIn: boolean;
  walletBound: boolean;
  identityComplete: boolean;
  /** Passport hook status: earned | pending | declined | not_started | … */
  identityStatus?: string | null;
  partnerPhase?: PartnerFlowPhaseLite | null;
  handoffReady?: boolean;
  consentPending?: boolean;
  consentDenied?: boolean;
  receiptIssued?: boolean;
  credentialExpired?: boolean;
  credentialRevoked?: boolean;
  insufficientEvidence?: boolean;
  returningSession?: boolean;
};

export function resolveHolderJourneyState(input: HolderJourneyResolveInput): HolderJourneyStateId | null {
  const phase = input.partnerPhase;

  if (phase === "pending_review") return "under_review";
  if (phase === "denied" || input.consentDenied) return "consent_denied";
  if (phase === "approved" || input.receiptIssued) {
    return input.handoffReady ? "partner_completed" : "receipt_issued";
  }
  if (phase === "returning" || (phase === "verifying" && input.handoffReady)) return "partner_return_pending";
  if (input.consentPending || phase === "preparing") return "consent_pending";
  if (input.credentialRevoked) return "evidence_revoked";
  if (input.credentialExpired || phase === "expired") return "evidence_expired";
  if (input.insufficientEvidence || phase === "method_not_qualified") return "additional_evidence_required";

  if (!input.signedIn) {
    return input.returningSession ? "returning" : "first_time";
  }

  if (input.signedIn && !input.walletBound) return "wallet_connected_unverified";

  const idStatus = (input.identityStatus ?? "").toLowerCase();
  if (idStatus === "pending") return "under_review";
  if (idStatus === "submitted" || idStatus === "in_progress" || idStatus === "session_created") {
    return "verification_submitted";
  }
  if (input.identityComplete || idStatus === "earned" || idStatus === "approved") {
    if (input.handoffReady) return "partner_completed";
    return "approved_evidence";
  }

  if (input.walletBound && !input.identityComplete) {
    return "additional_evidence_required";
  }

  return "returning";
}

export function holderJourneyCopyFor(input: HolderJourneyResolveInput): HolderJourneyStateCopy | null {
  const id = resolveHolderJourneyState(input);
  if (!id) return null;
  return HOLDER_JOURNEY_STATES[id];
}
