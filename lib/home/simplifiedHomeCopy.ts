// FILE: lib/home/simplifiedHomeCopy.ts
// Homepage copy — reusable private eligibility infrastructure.

export const SIMPLIFIED_HOME_EYEBROW = "REUSABLE PRIVATE ELIGIBILITY INFRASTRUCTURE";

export const SIMPLIFIED_HOME_HEADLINE = "Verify what matters. Reveal nothing else.";

export const SIMPLIFIED_HOME_SUBHEAD =
  "Abraxas lets applications verify eligibility without collecting the underlying identity data.";

export const SIMPLIFIED_HOME_MOBILE_PROMPT =
  "One Abraxas Passport. Reusable verified evidence. Each application asks a narrow policy question and receives only its approved answer.";

export const SIMPLIFIED_HOME_TRUST_LINE =
  "Use verified evidence again with fresh consent. Abraxas evaluates trust privately — applications receive signed eligibility receipts, not identity files.";

export const SIMPLIFIED_HOME_CTA_PRIMARY = "Open Passport";
export const SIMPLIFIED_HOME_CTA_SECONDARY = "Build an integration";
export const SIMPLIFIED_HOME_CTA_PRIMARY_HREF = "/passport";
export const SIMPLIFIED_HOME_CTA_SECONDARY_HREF = "/developers/integration-studio";
export const SIMPLIFIED_HOME_CTA_SANDBOX = "Try sandbox example";
export const SIMPLIFIED_HOME_CTA_SANDBOX_HREF = "/good-trouble";
export const SIMPLIFIED_HOME_CTA_BUILD = "Build with Abraxas";
export const SIMPLIFIED_HOME_CTA_BUILD_HREF = "/developers/integration-studio";

export const SIMPLIFIED_HERO_FLOW = [
  "Verify once",
  "Establish reusable evidence",
  "Application asks a policy question",
  "Receive a signed answer",
] as const;

export const SIMPLIFIED_HOW_IT_WORKS = [
  {
    id: "verify",
    title: "Verify once",
    body: "Complete verification when needed and carry reusable evidence in your Abraxas Passport.",
  },
  {
    id: "reuse",
    title: "Reuse evidence",
    body: "Eligible requests can be satisfied from existing verified evidence — no repeated ID upload.",
  },
  {
    id: "share",
    title: "Share only the answer",
    body: "Applications receive a signed eligibility receipt. Underlying identity data stays withheld.",
  },
] as const;

export const SIMPLIFIED_AUDIENCE_PEOPLE = {
  title: "For holders",
  body: "See who is asking, what they want to know, what will be shared, and what stays private.",
} as const;

export const SIMPLIFIED_AUDIENCE_BUSINESS = {
  title: "For partners",
  body: "Ask eligibility questions as policies, integrate in sandbox, verify receipts, and measure pilot progress.",
} as const;

export const SIMPLIFIED_TRUST_STATEMENT =
  "Google sign-in opens an account. Eligibility is a policy-specific signed answer. Identity documents appear only when a policy truly requires them.";

export const SIMPLIFIED_FINAL_LINE = "Ready to verify once?";

export const SIMPLIFIED_HOME_FORBIDDEN_TERMS = [
  "zklogin",
  "legally approved",
  "eliminates id checks",
  "everywhere",
  "military-grade",
  "jwks",
  "self_attested",
  "age_estimated",
  "blockchain",
  "cryptographic",
] as const;
