// FILE: lib/trustOverTime.ts
// Trust is time-bound. non-technical revocation / refresh story for institutional audiences.

export const TRUST_IS_TIME_BOUND_HEADLINE = "Trust is time-bound";

export const TRUST_IS_TIME_BOUND_SUBHEAD =
  "Verify once means you do not re-upload documents to every counterparty. It does not mean “trust this forever regardless of what changed.”";

export const TRUST_DEED_ANALOGY =
  "Think of a signed certificate. like a notarized copy, but mathematical. It attests what was true at issuance. If something material changes, the certificate stops working until refreshed. Counterparties check validity at transaction time; they do not need to call Abraxas and take our word for it.";

export const TRUST_VERIFY_ONCE_HONEST =
  "Verify once, reuse what remains valid, and refresh only what changed or expired.";

export const TRUST_FAIL_CLOSED =
  "Revoked or expired credentials must fail closed. always check state at transaction time, not cache indefinitely.";

export const REAL_ESTATE_REFRESH_TRIGGERS = [
  {
    event: "Ownership transfer / sale",
    action: "Title or registry claim refreshes; prior owner credentials scoped to old record",
    why: "Natural re-verification trigger. deed and county record change",
  },
  {
    event: "Refinance or new lien",
    action: "Encumbrance claims re-issued or suspended until updated attestation",
    why: "Lenders need current lien stack, not a point-in-time snapshot",
  },
  {
    event: "Appraisal expiry",
    action: "Valuation claim expires on TTL; policy may require new L3 attestation",
    why: "Collateral decisions need dated professional evidence",
  },
  {
    event: "Identity / screening TTL",
    action: "Passport identity ~12mo; screening ~24h; wallet binding step-up ~30d",
    why: "Person-level claims decay faster than land records",
  },
] as const;

export const TRUST_OVER_TIME_VERIFY = {
  label: "Relying party verify at transaction time",
  api: "POST /api/credentials/verify",
  registry: "GET /api/verify/registry",
  docsHref: "/integrations/relying-parties",
  verifyHref: "/verify",
} as const;

export const TRUST_OVER_TIME_FOR_PARTNERS = {
  title: "For title, lending, and compliance teams",
  bullets: [
    "Credentials are cryptographic attestations. not Abraxas reputation scores",
    "Each claim has an issuer, assurance level, and expiry. not one eternal KYC checkmark",
    "Real estate fits because recorded events (sale, lien, title) are natural refresh triggers",
    "Decision receipts prove a policy outcome at a point in time; validity is recomputed when read",
  ],
} as const;
