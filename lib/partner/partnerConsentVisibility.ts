// Partner consent belongs after required evidence is ready. Rendering it sooner
// turns incomplete setup into a misleading denied policy decision.

export function shouldShowPartnerConsent(input: {
  verificationRequestId: string | null;
  consentDismissed: boolean;
  /** True when the selected policy's required evidence is ready. Not login. */
  evidenceComplete?: boolean;
  /** @deprecated Use evidenceComplete. Kept so identity-complete still maps for identity packs. */
  identityComplete?: boolean;
  /** Browser method pick only. Never sufficient for consent. */
  methodSelected?: boolean;
  /** Server-verified qualification for this continuation. Required for consent. */
  methodQualified?: boolean;
  /** @deprecated Use methodQualified. Local success flags are not authority. */
  qualifyingMethodSucceeded?: boolean;
  underReview: boolean;
  handoffReady: boolean;
}): boolean {
  const methodQualified = input.methodQualified === true
    || input.qualifyingMethodSucceeded === true;
  if (input.methodSelected === true && !methodQualified) return false;
  if (input.identityComplete === true && !methodQualified) return false;
  if (input.evidenceComplete === true && !methodQualified) return false;
  return Boolean(input.verificationRequestId)
    && !input.consentDismissed
    && methodQualified
    && !input.underReview
    && !input.handoffReady;
}
