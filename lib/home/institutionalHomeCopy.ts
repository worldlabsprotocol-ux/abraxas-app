// Institutional homepage narrative — product-truthful, no production claims for devnet proofs.

import { INSTITUTIONAL_TRUST_CLOSURE, INSTITUTIONAL_TRUST_LEAD, INSTITUTIONAL_TRUST_THESIS } from "./institutionalTrustPositioning";

export const INSTITUTIONAL_HOME_EYEBROW = "Independent institutional trust layer";

export const INSTITUTIONAL_HOME_TITLE = INSTITUTIONAL_TRUST_THESIS;

export const INSTITUTIONAL_HOME_LEAD = `${INSTITUTIONAL_TRUST_LEAD} ${INSTITUTIONAL_TRUST_CLOSURE}`;

export const INSTITUTIONAL_HOME_DEFINITION = {
  what:
    "Abraxas is policy-bound trust infrastructure: authoritative evidence, issuer authority, signed decisions, and independent verification.",
  does:
    "Applications define what must be true for an action. Abraxas evaluates evidence and policy, then returns permit, deny, or indeterminate outcomes with portable proof. Custody, vault RBAC, and final enforcement stay in your systems.",
  why:
    "Institutions need decisions that remain checkable across platforms—who was authorized, under which policy, with evidence that is still current—not another permissions dashboard.",
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
    body: "Receipt validity respects expiration, issuer suspension, and authenticated portable revocation snapshots where configured. Verification fails closed when feeds are stale or untrusted.",
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
    description: "Configure institutional sandbox policies, provision a Launchpad application, and verify signed receipts without receiving identity evidence.",
    href: "/developers/integration-studio?pack=sandbox_institutional_protocol_access&path=institutional_eligibility_gate&action=org_protocol_access&category=institutional_eligibility&environment=sandbox",
    cta: "Start institutional sandbox",
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
