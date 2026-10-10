// Maps server reusable-eligibility decisions to holder-facing reuse matrix (Build #512).

import type { ReuseClientState } from "@/lib/passport/reusableEligibility/contract";
import type { EvidenceReuseDecisionResult } from "@/lib/passport/reusableEligibility/decision";
import {
  decideEvidenceReuse,
  type EvidenceReuseDecision,
  type EvidenceReuseInput,
} from "@/lib/holder/evidenceReuseDecision";

export type HolderEvidenceReuseHint = EvidenceReuseDecision & {
  /** Holder-safe; never includes fact ids or partner identifiers. */
  source: "server_reuse_lookup";
};

export function buildEvidenceReuseInputFromServer(input: {
  reuseState: ReuseClientState;
  serverDecision: EvidenceReuseDecisionResult | null;
  /** True only when holder has already granted consent for this bound request. */
  consentGrantedForRequest: boolean;
}): EvidenceReuseInput {
  const { reuseState, serverDecision, consentGrantedForRequest } = input;

  if (reuseState === "revoked") {
    return {
      hasQualifiedEvidence: false,
      evidenceExpired: false,
      evidenceRevoked: true,
      higherAssuranceRequired: false,
      consentGranted: false,
    };
  }

  if (reuseState === "expired" || serverDecision?.decision === "refresh_required") {
    return {
      hasQualifiedEvidence: true,
      evidenceExpired: true,
      evidenceRevoked: false,
      higherAssuranceRequired: false,
      consentGranted: false,
    };
  }

  if (reuseState === "available" && serverDecision?.decision === "reuse") {
    return {
      hasQualifiedEvidence: true,
      evidenceExpired: false,
      evidenceRevoked: false,
      higherAssuranceRequired: false,
      consentGranted: consentGrantedForRequest,
    };
  }

  if (
    reuseState === "incompatible"
    || reuseState === "sandbox_blocked"
    || serverDecision?.decision === "not_compatible"
  ) {
    return {
      hasQualifiedEvidence: false,
      evidenceExpired: false,
      evidenceRevoked: false,
      higherAssuranceRequired: true,
      consentGranted: false,
    };
  }

  return {
    hasQualifiedEvidence: false,
    evidenceExpired: false,
    evidenceRevoked: false,
    higherAssuranceRequired: false,
    consentGranted: false,
  };
}

export function holderEvidenceReuseHintFromServer(input: {
  reuseState: ReuseClientState;
  serverDecision: EvidenceReuseDecisionResult | null;
  consentGrantedForRequest?: boolean;
}): HolderEvidenceReuseHint {
  const matrixInput = buildEvidenceReuseInputFromServer({
    ...input,
    consentGrantedForRequest: input.consentGrantedForRequest ?? false,
  });
  return {
    ...decideEvidenceReuse(matrixInput),
    source: "server_reuse_lookup",
  };
}

export function publicEvidenceReuseHintPayload(hint: HolderEvidenceReuseHint): {
  outcome: HolderEvidenceReuseHint["outcome"];
  holder_message: string;
  consent_still_required: boolean;
} {
  return {
    outcome: hint.outcome,
    holder_message: hint.holderMessage,
    consent_still_required: hint.outcome === "request_consent_only"
      || hint.outcome === "reuse_without_recollection",
  };
}
