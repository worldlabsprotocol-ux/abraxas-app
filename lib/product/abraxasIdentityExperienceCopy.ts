// FILE: lib/product/abraxasIdentityExperienceCopy.ts
// Abraxas-native account vs verification language (avoid vendor-forward primary UX).

/** Shown only where account access must be distinguished from eligibility (secondary surfaces). */
export const ABRAXAS_ACCOUNT_NOT_VERIFICATION =
  "Signing in opens your Abraxas account. It does not prove age, identity, residency, wallet control, membership, or any other eligibility claim." as const;

export const ABRAXAS_SIGN_IN_LABEL = "Sign in" as const;

export const ABRAXAS_ACCOUNT_LABEL = "Your account" as const;

export const ABRAXAS_CHOOSE_VERIFICATION_HEADING = "Choose verification" as const;

export const ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_TITLE = "Institutional protocol access" as const;

export const ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_SUMMARY =
  "Confirm eligibility and receive a signed verification result." as const;

/** Passport / holder wallet setup — no seed phrase, Abraxas-managed wallet. */
export const ABRAXAS_PASSPORT_WALLET_INTRO =
  "Sign in to create your Abraxas account and Sui wallet. No seed phrase required." as const;

export const ABRAXAS_SIGN_IN_NOT_CONFIGURED =
  "Sign-in is not configured in this environment. Contact your operator or try again later." as const;

/** Primary session recovery — Abraxas product voice. */
export const ABRAXAS_CONTINUE_HEADLINE = "Continue to Abraxas" as const;

export const ABRAXAS_SESSION_EXPIRED_BODY =
  "Your session has expired. Sign in to continue." as const;

export const ABRAXAS_CONTINUE_SECURELY_LABEL = "Continue securely" as const;

/** Shown at the actual OAuth redirect step — accurate provider disclosure. */
export const ABRAXAS_OAUTH_PROVIDER_FOOTNOTE =
  "Secure sign-in uses Google account selection to open your Abraxas wallet. Google does not receive your verification credentials." as const;

export const PASSPORT_PRODUCT_TAGLINE =
  "Your identity and private verification credentials." as const;
