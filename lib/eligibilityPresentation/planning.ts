// FILE: lib/eligibilityPresentation/planning.ts
// KYC/KYB planning result categories. Not live packs. Not a Utila integration.

export const ELIGIBILITY_PLANNING_CATEGORIES = [
  "organization_eligible",
  "authorized_signer",
  "jurisdiction_eligible",
  "institutional_counterparty_eligible",
] as const;
export type EligibilityPlanningCategory = (typeof ELIGIBILITY_PLANNING_CATEGORIES)[number];

export const ELIGIBILITY_PLANNING_LABELS: Record<EligibilityPlanningCategory, string> = {
  organization_eligible: "Organization eligible (planning)",
  authorized_signer: "Authorized signer (planning)",
  jurisdiction_eligible: "Jurisdiction eligible (planning)",
  institutional_counterparty_eligible: "Institutional counterparty eligible (planning)",
};

export const ELIGIBILITY_PLANNING_NOTICE =
  "These are private result categories for Policy Proposals → Release Candidates → reviewed catalog change. No browser or partner can self-publish them as a live policy. They do not collect documents, store owner registers, run sanctions screening, or replace AML/KYT.";

export function isEligibilityPlanningCategory(value: string): value is EligibilityPlanningCategory {
  return (ELIGIBILITY_PLANNING_CATEGORIES as readonly string[]).includes(value);
}

export function eligibilityPlanningPublicChoices() {
  return {
    categories: ELIGIBILITY_PLANNING_CATEGORIES.map((id) => ({
      id,
      label: ELIGIBILITY_PLANNING_LABELS[id],
      live_policy: false as const,
      publishes_catalog: false as const,
      utila_integration: false as const,
      document_collection: false as const,
      owner_register_storage: false as const,
      sanctions_screening: false as const,
      aml_kyt_replacement: false as const,
    })),
    notice: ELIGIBILITY_PLANNING_NOTICE,
  };
}
