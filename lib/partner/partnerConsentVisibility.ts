// Partner consent belongs after required evidence is ready. Rendering it sooner
// turns incomplete setup into a misleading denied policy decision.

export function shouldShowPartnerConsent(input: {
  verificationRequestId: string | null;
  consentDismissed: boolean;
  /** True when the selected policy's required evidence is ready. Not login. */
  evidenceComplete?: boolean;
  /** @deprecated Use evidenceComplete. Kept so identity-complete still maps for identity packs. */
  identityComplete?: boolean;
  underReview: boolean;
  handoffReady: boolean;
}): boolean {
  const evidenceReady = input.evidenceComplete ?? input.identityComplete ?? false;
  return Boolean(input.verificationRequestId)
    && !input.consentDismissed
    && evidenceReady
    && !input.underReview
    && !input.handoffReady;
}
