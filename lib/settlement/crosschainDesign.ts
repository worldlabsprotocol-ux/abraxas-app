// FILE: lib/settlement/crosschainDesign.ts
// Future CCTP crosschain extension design. Not implemented in this PR.

export interface CrosschainSettlementProgress {
  stage: "approval" | "burn" | "attestation" | "mint" | "confirmed" | "failed" | "cancelled";
  sourceChain: string;
  destinationChain: string;
  bridgeAuthorizationId?: string;
  eligibilityAuthorizationId: string;
  message?: string;
}

/**
 * Future bridge flow via Circle CCTP and Arc App Kit:
 * 1. Eligibility authorization (Abraxas EIP-712) remains separate from bridge authorization.
 * 2. Server holds App Kit keys; browser never receives bridge signing secrets.
 * 3. Progress surfaces approval, burn, attestation, and mint stages.
 * 4. Settlement success requires destination Arc transaction confirmation.
 * 5. No custom unsafe bridge logic.
 */
export const CCTP_EXTENSION_NOTES = [
  "Use official @circle-fin packages with pinned reviewed versions.",
  "Keep Arc App Kit keys server side.",
  "Distinguish bridge authorization from eligibility authorization.",
  "Expose progress for approval, burn, attestation, and mint.",
  "Handle cancellation and failure without reporting premature success.",
] as const;
