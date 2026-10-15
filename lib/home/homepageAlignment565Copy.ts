// FILE: lib/home/homepageAlignment565Copy.ts
// Homepage narrative aligned to Builds #550–#565 — product-truthful only.

export const HOMEPAGE_ALIGNMENT_EYEBROW = "Universal holder-controlled trust";

export const HOMEPAGE_HERO_LEAD =
  "Abraxas Passport lets holders verify once with an authorized issuer, carry portable signed authorizations, and present policy-scoped answers to each institution. Partners verify cryptographically, without Abraxas identity databases at decision time.";

export const HOMEPAGE_RECEIPT_SCOPE_NOTE =
  "Today, partner authorization uses signed decision receipts bound to each partner and policy. Passport export and portable presentations extend holder control. Universal reuse across every institution without consent is a roadmap goal, not a blanket guarantee on every live integration.";

export const HOMEPAGE_HERO_DISCLAIMER =
  "Policy-scoped presentation is not zero-knowledge selective disclosure. Sandbox and devnet proofs are labeled separately. They are not production certification or universal institutional acceptance.";

export const HOMEPAGE_FOUR_PILLARS = [
  {
    id: "passport",
    title: "Abraxas Passport",
    summary:
      "Verify identity or eligibility through an authorized issuer, receive a portable credential, and approve what each partner may receive.",
    detail:
      "Passport shows assurance, partner requests, and exportable policy-scoped presentations. Live partner flows issue partner-bound authorization receipts today; cross-partner portable credentials are demonstrated in sandbox and build toward broader reuse.",
    href: "/passport",
    cta: "Open Passport",
  },
  {
    id: "sovereign",
    title: "Sovereign trust",
    summary:
      "Abraxas-controlled credential authority and open verification standards, without centralized custody of personal identity files for every partner call.",
    detail:
      "Issuers, registry keys, and policy bindings are explicit. Holders retain control of export and consent; operators govern production activation.",
    href: "/protocol",
    cta: "Protocol overview",
  },
  {
    id: "independent",
    title: "Independent verification",
    summary:
      "Institutions re-check signatures, policy binding, freshness, and authenticated portable revocation locally.",
    detail:
      "Proof-first relying parties can authorize using trusted issuer keys and signed revocation feeds, with no Abraxas identity API during partner authorization (demonstrated in tests and developer demos).",
    href: "/verify",
    cta: "Verify a receipt",
  },
  {
    id: "privacy",
    title: "Privacy by architecture",
    summary:
      "Partners receive the evidence-backed answer their policy requires, not underlying documents, biometrics, or unnecessary personal fields.",
    detail:
      "Decision receipts carry claim references and outcomes. Receipt metadata may still be linkable within a partner context; Abraxas does not introduce a universal holder tracking identifier.",
    href: "/developers/passport-portable-trust",
    cta: "Portable trust demo",
  },
] as const;

export const HOMEPAGE_ENTRY_PASSPORT = { label: "Open Passport", href: "/passport" } as const;
export const HOMEPAGE_ENTRY_PARTNER = {
  label: "Partner verification",
  href: "/developers/integration-studio?outcome=reuse_across_app&source=homepage",
} as const;
