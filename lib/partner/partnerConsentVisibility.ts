// Partner consent belongs after required evidence is ready. Rendering it sooner
// turns incomplete setup into a misleading denied policy decision.

export function shouldShowPartnerConsent(input: {
  verificationRequestId: string | null;
  consentDismissed: boolean;
  identityComplete: boolean;
  underReview: boolean;
  handoffReady: boolean;
}): boolean {
  return Boolean(input.verificationRequestId)
    && !input.consentDismissed
    && input.identityComplete
    && !input.underReview
    && !input.handoffReady;
}
