// FILE: lib/home/simplifiedHomeCopy.ts
// Minimal homepage copy — human, high-impact positioning.

export const SIMPLIFIED_HOME_EYEBROW = "PRIVATE ELIGIBILITY PROTOCOL";

export const SIMPLIFIED_HOME_HEADLINE = "Prove only what a service needs.";

export const SIMPLIFIED_HOME_MOBILE_PROMPT =
  "Prove eligibility, verify a result, or try a sandbox example.";

export const SIMPLIFIED_HOME_TRUST_LINE =
  "Use one private verification again with fresh consent. Abraxas does not execute trades, payments, or transfers.";

export const SIMPLIFIED_HOME_CTA_PRIMARY = "Prove eligibility";
export const SIMPLIFIED_HOME_CTA_SECONDARY = "Verify a result";
export const SIMPLIFIED_HOME_CTA_PRIMARY_HREF = "/passport";
export const SIMPLIFIED_HOME_CTA_SECONDARY_HREF = "/verification";
export const SIMPLIFIED_HOME_CTA_BUILD = "Build with Abraxas";
export const SIMPLIFIED_HOME_CTA_BUILD_HREF = "/developers/integration-studio";

export const SIMPLIFIED_HERO_FLOW = [
  "Person",
  "Partner",
  "Protocol explorer",
] as const;

export const SIMPLIFIED_HOW_IT_WORKS = [
  {
    id: "verify",
    title: "Verify",
    body: "Complete the appropriate check when it is needed.",
  },
  {
    id: "keep",
    title: "Keep",
    body: "Carry reusable proof in your Abraxas Passport.",
  },
  {
    id: "share",
    title: "Share",
    body: "Provide only the result a participating service requires.",
  },
] as const;

export const SIMPLIFIED_AUDIENCE_PEOPLE = {
  title: "For people",
  body: "Less repetition. Less unnecessary data sharing. More control.",
} as const;

export const SIMPLIFIED_AUDIENCE_BUSINESS = {
  title: "For businesses",
  body: "Request policy specific proof without collecting more personal information than necessary.",
} as const;

export const SIMPLIFIED_TRUST_STATEMENT =
  "Google sign-in opens an account. Eligibility is a result defined by each partner policy. Identity or liveness appears only when a policy truly requires it.";

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
