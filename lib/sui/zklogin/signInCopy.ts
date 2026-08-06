// FILE: lib/sui/zklogin/signInCopy.ts
// End-user copy for zkLogin sign-in controls (buttons, helpers, accessible labels, errors).

export const ZKLOGIN_SIGN_IN_COPY = {
  openButton: "Sign in",
  openButtonAriaLabel: "Sign in to your Abraxas Passport",
  chooserTitle: "Access your Passport",
  legacySectionHeading: "Already have a Passport?",
  closeButton: "Close",

  canonicalButton: "Continue with Google",
  canonicalHelper: "New to Abraxas? This creates your Passport.",
  canonicalAriaLabel: "Continue with Google to create your Abraxas Passport",

  legacyButton: "Use an existing Passport",
  legacyHelper: "Had an Abraxas Passport before our sign-in update? Continue here.",
  legacyAriaLabel: "Use an existing Passport from before our sign-in update",

  redirecting: "Redirecting…",

  errors: {
    audienceMismatch:
      "We found your existing Abraxas Passport. Use an existing Passport to continue.",
    audienceMismatchDetail:
      "We found your existing Abraxas Passport, but Continue with Google will not open it. Use an existing Passport instead.",
    noExistingAccount:
      "No Abraxas Passport was found for this Google identity. Continue with Google to create a new Passport.",
    legacyNotConfigured:
      "Use an existing Passport is not available in this environment. Contact support if you had a Passport before our sign-in update.",
    legacyClientRequired:
      "Use an existing Passport to sign in with the Google account tied to your Passport.",
    addressMismatch:
      "We could not verify your Passport with this sign-in. Try Use an existing Passport, or contact support.",
  },
} as const;

/** Backend jargon that must not appear in end-user sign-in copy. */
export const FORBIDDEN_ZKLOGIN_USER_COPY_TERMS = [
  "oauth client",
  "oauth",
  "audience",
  "legacy configuration",
  "address derivation",
  "client id",
  "configuration that created",
] as const;

export function collectZkLoginUserFacingCopy(): string[] {
  const { errors, ...surface } = ZKLOGIN_SIGN_IN_COPY;
  return [
    ...Object.values(surface),
    ...Object.values(errors),
  ];
}
