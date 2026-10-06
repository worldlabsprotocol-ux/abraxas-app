// FILE: lib/partner/designPartnerProgram/fundraisingSlides.ts
// Map real evidence to seed-deck slide readiness.

import type { CaseStudyPermissionsRow } from "./store";
import type { DesignPartnerFunnelCounts } from "./funnel";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";

export interface SlideReadiness {
  slide: string;
  status: "supported" | "partial" | "unavailable" | "operator_input_required";
  evidence: string[];
  missing: string[];
}

export function buildFundraisingSlideReadiness(input: {
  funnel: DesignPartnerFunnelCounts;
  permissions: CaseStudyPermissionsRow[];
  valueEvidence: ApplicationValueEvidence[];
  portfolioEvidence: ReturnType<typeof import("./portfolioExport").buildDesignPartnerPortfolioEvidence>;
}): SlideReadiness[] {
  const logoApproved = input.permissions.filter((p) => p.logo_permission === "approved").length;
  const nameApproved = input.permissions.filter((p) => p.company_name_permission === "approved").length;
  const reuse = input.valueEvidence.some((e) => e.pilot_sandbox.metrics.evidence_reuse_count.value > 0);
  const expansion = input.valueEvidence.some((e) => e.policy_expansion_production.policy_expansion_observed);
  const caseStudyReady = input.portfolioEvidence.case_studies.ready > 0;

  return [
    {
      slide: "Slide 2 — What we do + customer logos",
      status: logoApproved > 0 ? "partial" : "operator_input_required",
      evidence: nameApproved > 0 ? [`${nameApproved} approved company name permission(s)`] : [],
      missing: logoApproved === 0 ? ["approved_logo_permissions"] : [],
    },
    {
      slide: "Slide 3 — Problem / user journey",
      status: "supported",
      evidence: ["Hosted partner flow", "Policy-specific receipts"],
      missing: ["Customer-reported journey outcomes for deck copy"],
    },
    {
      slide: "Slide 4 — Core differentiator",
      status: reuse ? "supported" : "partial",
      evidence: ["Policy-specific receipts", "Privacy minimization contracts", reuse ? "Reusable verified evidence" : ""].filter(Boolean),
      missing: reuse ? [] : ["Sufficient reuse event volume"],
    },
    {
      slide: "Slide 5 — Stickiness",
      status: expansion || input.portfolioEvidence.repeat_production_activity_observed > 0 ? "partial" : "unavailable",
      evidence: [
        expansion ? "Policy expansion observed" : "",
        input.portfolioEvidence.repeat_production_activity_observed > 0 ? "Repeat production activity" : "",
      ].filter(Boolean),
      missing: ["Long-horizon cohort retention"],
    },
    {
      slide: "Slide 6 — Business model",
      status: "operator_input_required",
      evidence: ["Commercial model candidate metadata", "Unit economics readiness structure"],
      missing: ["Validated pricing model", "Verified cost inputs"],
    },
    {
      slide: "Slide 7 — Revenue / ACV",
      status: "unavailable",
      evidence: [],
      missing: ["ARR", "ACV", "revenue — require verified financial source"],
    },
    {
      slide: "Slide 8 — GTM",
      status: input.funnel.accepted_design_partners > 0 ? "partial" : "unavailable",
      evidence: [
        `Accepted design partners: ${input.funnel.accepted_design_partners}`,
        `Production active: ${input.funnel.production_active}`,
        `Converted: ${input.funnel.converted}`,
      ],
      missing: ["Pipeline dollars", "Loss reason volume for statistical confidence"],
    },
    {
      slide: "Slide 9 — Customer case study",
      status: caseStudyReady ? "partial" : "unavailable",
      evidence: caseStudyReady ? ["Publishable case-study artifact available"] : [],
      missing: caseStudyReady ? [] : ["Approved quote", "Approved metrics", "Public case study permission"],
    },
  ];
}
