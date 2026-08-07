// FILE: lib/sui/zklogin/signInCopy.ts
// End-user copy for zkLogin sign-in controls (buttons, helpers, accessible labels, errors).

export const ZKLOGIN_SIGN_IN_COPY = {
  openButton: "Sign in",
  openButtonAriaLabel: "Sign in to your Abraxas Passport",
  chooserTitle: "Access your Passport",
  legacySectionHeading: "Older sign-in setup",
  closeButton: "Close",

  canonicalButton: "Continue with Google",
  canonicalHelper: "Recommended for most Passports.",
  canonicalAriaLabel: "Continue with Google to create or open your Abraxas Passport",

  legacyButton: "Recover a Passport created with an older sign-in setup",
  legacyHelper:
    "Use this only when Continue with Google does not open your Passport and you are directed here.",
  legacyAriaLabel: "Recover a Passport created with an older sign-in setup",

  recoveryDismissButton: "Dismiss",
  recoveryDismissAriaLabel: "Dismiss sign-in guidance",

  redirecting: "Redirecting…",

  errors: {
    audienceMismatch:
      "We found your existing Abraxas Passport. Follow the recommended sign-in option below.",
    audienceMismatchDetail:
      "Your Passport was created with an older sign-in setup. Use legacy recovery below only if you are directed here.",
    audienceMismatchUseCanonical:
      "Your Abraxas Passport opens with Continue with Google. Use that option here instead of legacy recovery.",
    wrongPathForLegacyRecovery:
      "This sign-in path does not match your Passport. Use the recommended option below.",
    wrongPathForCanonical:
      "Your Passport opens with Continue with Google. Choose that option below instead of legacy recovery.",
    noExistingAccount:
      "No Abraxas Passport was found for this Google identity. Continue with Google to create a new Passport.",
    legacyNotConfigured:
      "Legacy recovery is not available in this environment. Contact support if you had a Passport before our sign-in update.",
    legacyClientRequired:
      "Use legacy recovery to sign in with the Google account tied to your Passport.",
    addressMismatch:
      "We could not verify your Passport with this sign-in. Try the recommended sign-in option below, or contact support.",
    signInExpired: "Sign-in expired—please try again",
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
