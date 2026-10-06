// FILE: lib/integrate/businessPageCopy.ts
// For businesses product page — value before implementation.

export const BUSINESS_PAGE_EYEBROW = "For multi-app fintech & digital-asset platforms";

export const BUSINESS_PAGE_HEADLINE = "Stop re-verifying the same customer across every app";

export const BUSINESS_PAGE_SUBHEAD =
  "Keep your existing KYC provider. Abraxas turns trusted verification into reusable, application-specific answers — without passing the underlying identity package between applications.";

export const BUSINESS_PAGE_CTA_PRIMARY = "See reuse across two apps";
export const BUSINESS_PAGE_CTA_SECONDARY = "Prove reuse in sandbox";
export const BUSINESS_PAGE_CTA_PRIMARY_HREF = "/proof";
export const BUSINESS_PAGE_CTA_SECONDARY_HREF =
  "/developers/integration-studio?outcome=reuse_across_app&source=gtm-integrate";

export const BUSINESS_BENEFITS = [
  {
    id: "reduce-repetition",
    title: "Reuse across applications",
    body: "Compatible verified evidence can satisfy a second workflow without raw KYC recollection.",
  },
  {
    id: "minimize-data",
    title: "Receive the decision, not the file",
    body: "Each application gets the answer it is authorized to use — not unnecessary identity fields.",
  },
  {
    id: "clear-decisions",
    title: "Keep your KYC provider",
    body: "Abraxas sits after verification and controls reuse, disclosure, and server-verifiable results.",
  },
] as const;

export const BUSINESS_INTEGRATION_PILLARS = [
  "Partner specific policies",
  "Private eligibility results",
  "Server verifiable decisions",
  "Reusable customer proof",
] as const;

export const BUSINESS_PARTNER_PROOF_TITLE = "Reference proof: one verification, two applications";
export const BUSINESS_PARTNER_PROOF_BADGE = "Reference harness · not production customer";

export const BUSINESS_DEV_TOOLS_NOTE =
  "Integration documentation, Partner Flow guides, and receipt verification tools are available from the footer and this page.";
