// FILE: lib/integrate/businessPageCopy.ts
// For businesses product page — value before implementation.

import { AUTHENTICITY_VS_AUTHORITY, INSTITUTIONAL_TRUST_LEAD } from "@/lib/home/institutionalTrustPositioning";

export const BUSINESS_PAGE_EYEBROW = "For institutions, treasury, and multi-app platforms";

export const BUSINESS_PAGE_HEADLINE = "Independently verifiable trust for institutional actions";

export const BUSINESS_PAGE_SUBHEAD = `${INSTITUTIONAL_TRUST_LEAD} Abraxas fits alongside custody, vault permissions, and your existing KYC stack—it does not replace them. ${AUTHENTICITY_VS_AUTHORITY}`;

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
    title: "Keep your enforcement stack",
    body: "Vault RBAC, signing workflows, and transaction engines stay in your systems. Abraxas supplies portable, policy-bound decisions your app verifies before acting.",
  },
] as const;

export const BUSINESS_INTEGRATION_PILLARS = [
  "Policy-bound decisions",
  "Independent verification",
  "Authority & continuity checks",
  "Permit · deny · indeterminate",
] as const;

export const BUSINESS_PARTNER_PROOF_TITLE = "Reference proof: one verification, two applications";
export const BUSINESS_PARTNER_PROOF_BADGE = "Reference harness · not production customer";

export const BUSINESS_DEV_TOOLS_NOTE =
  "Integration documentation, Partner Flow guides, and receipt verification tools are available from the footer and this page.";
