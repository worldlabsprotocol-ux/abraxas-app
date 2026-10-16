// FILE: lib/home/defiVisualHomeCopy.ts
// Homepage hero pipeline copy — institutional verification thesis (PR #716 surfaces).

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

export type TrustPipelineStageId = (typeof DEFI_TRUST_PIPELINE)[number]["id"];

/** Illustrative stage detail — protocol mechanics, not a live verification outcome. */
export const TRUST_PIPELINE_STAGE_DETAIL: Record<
  TrustPipelineStageId,
  { headline: string; body: string; vizLabel: string }
> = {
  issuer: {
    headline: "Issuer authority and pinned trust",
    body: "Relying parties pin issuer keys and policy versions. Trust roots stay under institutional control—not Abraxas identity databases at authorization time.",
    vizLabel: "Pinned issuer keys",
  },
  policy: {
    headline: "Application-scoped policy request",
    body: "Applications request a narrow decision against a specific policy_id. Abraxas evaluates only permitted evidence for that ask.",
    vizLabel: "Scoped policy_id",
  },
  decision: {
    headline: "Signed decision and cryptographic provenance",
    body: "When authorization succeeds, the holder receives a scoped, signed, expiring decision artifact. Privacy boundaries stay with the holder.",
    vizLabel: "Ed25519 decision payload",
  },
  verifier: {
    headline: "Independent relying-party verification",
    body: "Verifiers validate signatures, policy binding, and expiry offline. Authorization does not require querying Abraxas for underlying identity.",
    vizLabel: "Offline signature verify",
  },
};
