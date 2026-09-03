// FILE: lib/home/simplifiedHomeCopy.ts
// Minimal homepage copy — human, high-impact positioning.

export const SIMPLIFIED_HOME_EYEBROW = "PRIVATE, REUSABLE VERIFICATION";

export const SIMPLIFIED_HOME_HEADLINE = "Tired of verifying yourself over and over?";

export const SIMPLIFIED_HOME_SUBHEAD =
  "Verify once with Abraxas. Privately prove only what a service needs—without repeatedly sharing your personal information.";

export const SIMPLIFIED_HOME_TRUST_LINE =
  "You control what is shared. Partners receive the result—not your underlying documents.";

export const SIMPLIFIED_HOME_CTA_PRIMARY = "Create your Passport";
export const SIMPLIFIED_HOME_CTA_SECONDARY = "Use Abraxas for your business";
export const SIMPLIFIED_HOME_CTA_PRIMARY_HREF = "/passport";
export const SIMPLIFIED_HOME_CTA_SECONDARY_HREF = "/integrations#apply";

export const SIMPLIFIED_HERO_FLOW = [
  "Verify once",
  "Use across participating services",
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
  body: "Request policy-specific proof without collecting more personal information than necessary.",
} as const;

export const SIMPLIFIED_TRUST_STATEMENT =
  "Authentication starts the process. Approved evidence establishes eligibility. Each partner makes its own final decision.";

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
