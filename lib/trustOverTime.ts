// FILE: lib/trustOverTime.ts

export const TRUST_FRAMEWORK_INTRO =
  "Verification at Abraxas is cryptographic and time-bound. Credentials are valid attestations — not permanent stamps. They are designed to refresh or revoke when underlying facts change.";

export const TRUST_IS_TIME_BOUND_HEADLINE = "Trust is time-bound";

export const TRUST_IS_TIME_BOUND_SUBHEAD =
  "Verify once means you don't re-upload documents to every counterparty. It does not mean trust forever.";

export const TRUST_DEED_ANALOGY =
  "Think of a deed: it proves ownership at a point in time, not forever. Counterparties don't take our word for it — they verify a signed credential themselves. If something material changes, the credential stops working until refreshed.";

export const TRUST_VERIFY_ONCE_HONEST =
  "Verify once, reuse what remains valid, and refresh only what changed or expired.";

export const TRUST_FAIL_CLOSED =
  "Revoked or expired credentials fail closed — always check state at transaction time.";

export const TRUST_OVER_TIME = {
  headline: TRUST_IS_TIME_BOUND_HEADLINE,
  intro: TRUST_IS_TIME_BOUND_SUBHEAD,
  deedAnalogy: TRUST_DEED_ANALOGY,
  closingNote: TRUST_FAIL_CLOSED,
} as const;

export const REAL_ESTATE_REFRESH_TRIGGERS = [
  { event: "Ownership transfer / sale", action: "Title claim refreshes; prior owner scope ends" },
  { event: "Refinance or new lien", action: "Encumbrance claims re-issued or suspended" },
  { event: "Appraisal expiry", action: "Valuation claim expires; new attestation if required" },
  { event: "Identity / screening TTL", action: "Identity ~12mo; screening ~24h; wallet step-up ~30d" },
] as const;

export const TRUST_OVER_TIME_VERIFY = {
  docsHref: "/developers#verify-api",
  verifyHref: "/passport",
} as const;
