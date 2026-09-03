// FILE: lib/integrate/businessPageCopy.ts
// For businesses product page — value before implementation.

export const BUSINESS_PAGE_EYEBROW = "For businesses";

export const BUSINESS_PAGE_HEADLINE = "Private verification for your product";

export const BUSINESS_PAGE_SUBHEAD =
  "Request the eligibility result you need without collecting more personal information than necessary.";

export const BUSINESS_PAGE_CTA_PRIMARY = "Apply as a design partner";
export const BUSINESS_PAGE_CTA_SECONDARY = "View integration docs";

export const BUSINESS_BENEFITS = [
  {
    id: "reduce-repetition",
    title: "Reduce repetition",
    body: "Returning users can reuse appropriate proof.",
  },
  {
    id: "minimize-data",
    title: "Minimize sensitive data",
    body: "Receive the result instead of unnecessary identity documents.",
  },
  {
    id: "clear-decisions",
    title: "Make clear decisions",
    body: "Verify partner-specific results on your server.",
  },
] as const;

export const BUSINESS_INTEGRATION_PILLARS = [
  "Partner-specific policies",
  "Private eligibility results",
  "Server-verifiable decisions",
  "Reusable customer proof",
] as const;

export const BUSINESS_PARTNER_PROOF_TITLE = "First relying-partner pilot";
export const BUSINESS_PARTNER_PROOF_BADGE = "Integration testing underway";

export const BUSINESS_DEV_TOOLS_NOTE =
  "Integration documentation, Partner Flow guides, and receipt verification tools are available from the footer and this page.";
