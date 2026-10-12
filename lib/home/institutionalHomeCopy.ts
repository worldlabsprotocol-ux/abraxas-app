// Institutional homepage narrative — product-truthful, no production claims for devnet proofs.

export const INSTITUTIONAL_HOME_EYEBROW = "Independent trust & eligibility infrastructure";

export const INSTITUTIONAL_HOME_TITLE =
  "Policy-specific authorization without shared identity databases";

export const INSTITUTIONAL_HOME_LEAD =
  "Applications request narrow eligibility decisions. Holders approve what to share. Abraxas returns signed receipts partners can verify independently, not underlying identity files.";

export const INSTITUTIONAL_HOME_DEFINITION = {
  what:
    "Abraxas is verification and authorization infrastructure: reusable evidence, policy evaluation, and signed decision receipts.",
  does:
    "Partners configure required claims and assurance levels. Holders satisfy requests with consent. Abraxas evaluates trust and returns approved, denied, or manual-review outcomes with audit references.",
  why:
    "Verification can be reused across applications, decisions can be re-checked without Abraxas as a single point of trust, and authorization can be revoked when policy or issuer state changes.",
} as const;

export const INSTITUTIONAL_TRUST_BOUNDARIES = [
  {
    id: "holder",
    title: "Holder custody",
    body: "Passport and consent UI. Holders see what each application asks and approve narrow disclosures.",
  },
  {
    id: "evaluation",
    title: "Policy evaluation",
    body: "Server-side policy engine evaluates live claim status against partner rules, not a static profile export.",
  },
  {
    id: "receipt",
    title: "Signed receipts",
    body: "Partners receive decision receipts suitable for independent verification; underlying documents stay withheld unless policy requires capture.",
  },
  {
    id: "revocation",
    title: "Revocation & freshness",
    body: "Receipt validity respects expiration, issuer suspension, and revocation signals, including on-chain commitments where configured.",
  },
] as const;

export const INSTITUTIONAL_JOURNEY_PATHS = [
  {
    id: "holder",
    title: "Holder verification",
    description: "Establish reusable evidence in Abraxas Passport and approve partner-specific requests.",
    href: "/passport",
    cta: "Open Passport",
    accent: "passport" as const,
  },
  {
    id: "partner",
    title: "Partner integration",
    description: "Configure policies, run sandbox flows, and verify signed receipts in Integration Studio.",
    href: "/integrations",
    cta: "Integration Studio",
    accent: "developer" as const,
  },
  {
    id: "verify",
    title: "Independent verification",
    description: "Validate a decision receipt without trusting Abraxas UI. Uses cryptographic and API-backed checks.",
    href: "/verify",
    cta: "Verify a receipt",
    accent: "verify" as const,
  },
] as const;

export const INSTITUTIONAL_DEVNET_DISCLAIMER =
  "Solana devnet proofs and sandbox demos are labeled separately. They are not production deployments.";
