// FILE: lib/integrate/businessPageCopy.ts
// For businesses product page — value before implementation.

export const BUSINESS_PAGE_EYEBROW = "For businesses";

export const BUSINESS_PAGE_HEADLINE = "Add private verification to your product";

export const BUSINESS_PAGE_SUBHEAD =
  "Request the eligibility result you need without collecting more personal information than necessary.";

export const BUSINESS_PAGE_CTA_PRIMARY = "Apply as a design partner";
export const BUSINESS_PAGE_CTA_SECONDARY = "View developer docs";

export const BUSINESS_BENEFITS = [
  {
    id: "less-friction",
    title: "Less friction",
    body: "Help returning users avoid repeating the same verification.",
  },
  {
    id: "less-data",
    title: "Less sensitive data",
    body: "Receive a policy-specific result instead of unnecessary identity documents.",
  },
  {
    id: "clear-decisions",
    title: "Clear decisions",
    body: "Verify signed results on your server before granting access.",
  },
] as const;

export const BUSINESS_PROCESS_STEPS = [
  "Choose what your service needs.",
  "Send the customer to Abraxas.",
  "Receive and verify the result.",
] as const;

export const BUSINESS_PARTNER_PROOF_TITLE = "First relying-partner pilot";
export const BUSINESS_PARTNER_PROOF_BADGE = "Integration testing underway";

export const BUSINESS_DEV_TOOLS_NOTE =
  "Receipt testing, callback parameters, and server examples live in Docs and Developer tools.";
