// FILE: lib/passport/passportCustomerCopy.ts
// Customer-facing Passport language — separate from developer terminology.

export const PASSPORT_PAGE_EYEBROW = "Your Abraxas Passport";

export const PASSPORT_PAGE_HEADLINE = "Your Abraxas Passport";

export const PASSPORT_PAGE_SUBHEAD =
  "Keep and reuse private proof when participating services request it.";

export const PASSPORT_SECURE_ACCOUNT_LABEL = "Secure your Passport";
export const PASSPORT_SECURE_ACCOUNT_SUB = "One secure confirmation";
export const PASSPORT_SECURE_ACCOUNT_EXPLAINER =
  "One secure confirmation connects this Passport to your account. No funds move, and no purchase is made.";

export const PASSPORT_ADD_VERIFIED_INFO_LABEL = "Add verified information";
export const PASSPORT_ADD_VERIFIED_INFO_SUB = "Only when a service requires it";

export const PASSPORT_USE_PASSPORT_LABEL = "Use your Passport";
export const PASSPORT_USE_PASSPORT_SUB = "Share only what is needed";

export const PASSPORT_SIGN_IN_LABEL = "Sign in";
export const PASSPORT_SIGN_IN_SUB = "Start with your account";

export const PASSPORT_ADVANCED_DETAILS_TITLE = "Advanced details";

export const PASSPORT_SETUP_STEPS = [
  { key: "sign_in", label: PASSPORT_SIGN_IN_LABEL, sub: PASSPORT_SIGN_IN_SUB },
  { key: "bind_wallet", label: PASSPORT_SECURE_ACCOUNT_LABEL, sub: PASSPORT_SECURE_ACCOUNT_SUB },
  { key: "verify_identity", label: PASSPORT_ADD_VERIFIED_INFO_LABEL, sub: PASSPORT_ADD_VERIFIED_INFO_SUB },
  { key: "use_credential", label: PASSPORT_USE_PASSPORT_LABEL, sub: PASSPORT_USE_PASSPORT_SUB },
] as const;
