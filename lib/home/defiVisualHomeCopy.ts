// FILE: lib/home/defiVisualHomeCopy.ts
// Concise homepage copy for DeFi cinematic hero (founder visual direction).

export const DEFI_HOME_EYEBROW = "Institutional trust infrastructure";

export const DEFI_HOME_HEADLINE = "Verify decisions. Not identity warehouses.";

export const DEFI_HOME_SUPPORT =
  "Policy evaluation, holder authorization, signed receipts, and independent verifier cryptography—with privacy minimization by design.";

export const DEFI_HOME_CTA_PRIMARY = "Open Integration Studio";
export const DEFI_HOME_CTA_PRIMARY_HREF =
  "/developers/integration-studio?outcome=reuse_across_app&source=defi-home-hero";

export const DEFI_HOME_CTA_SECONDARY = "Institutional verification SDK";
export const DEFI_HOME_CTA_SECONDARY_HREF = "/developers/institutional-verification";

export const DEFI_TRUST_GLASS_MODULES = [
  {
    id: "policy",
    label: "Policy evaluation",
    value: "Scoped eligibility",
    detail: "Server-pinned policy_id and version",
    href: "/developers/integration-studio",
  },
  {
    id: "consent",
    label: "Holder authorization",
    value: "Consent-bound",
    detail: "No silent reuse across tenants",
    href: "/passport",
  },
  {
    id: "receipt",
    label: "Signed receipt",
    value: "Ed25519 decision",
    detail: "Offline-verifiable payload",
    href: "/developers/institutional-verification",
  },
  {
    id: "verify",
    label: "Independent verify",
    value: "Your trust root",
    detail: "Digest v2 issuer pins",
    href: "/verify?mode=receipt",
  },
] as const;

export const DEFI_TRUST_PIPELINE = [
  { id: "issuer", label: "Issuer trust", short: "Pinned keys" },
  { id: "policy", label: "Policy request", short: "Scoped ask" },
  { id: "decision", label: "Signed decision", short: "Cryptographic payload" },
  { id: "verifier", label: "Independent verification", short: "Authorize / reject" },
] as const;
