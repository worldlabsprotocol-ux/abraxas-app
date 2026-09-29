// FILE: lib/partner/valueEvidence/fundraising.ts
// Fundraising evidence matrix — diligence support, not a pitch deck.

import type { FundraisingEvidenceRow } from "./contract";
import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { PolicyExpansionEvidence } from "./contract";
import type { ConversionCounts } from "./conversion";
import { REVENUE_BOUNDARY } from "./unitEconomics";

export function buildFundraisingEvidenceMatrix(input: {
  valueDimensions: Record<string, { status: string; limitations: string[] }>;
  pilotSandbox: PartnerPilotSummary | null;
  policyExpansion: PolicyExpansionEvidence;
  conversionCounts: ConversionCounts;
  caseStudyReady: boolean;
}): FundraisingEvidenceRow[] {
  const reuse = (input.pilotSandbox?.metrics.evidence_reuse_count.value ?? 0) > 0;
  const multiPolicy = input.policyExpansion.policy_expansion_observed;
  const productionActive = input.conversionCounts.production_active > 0;

  return [
    {
      category: "1. founder/team",
      status: "operator_input_required",
      evidence: [],
      missing: ["Team narrative is operator-provided"],
    },
    {
      category: "2. product/category",
      status: "supported",
      evidence: ["Reusable private eligibility infrastructure", "Policy-specific signed receipts"],
      missing: [],
    },
    {
      category: "3. problem/user journey",
      status: "partial",
      evidence: ["Hosted partner flow", "Server-side verifyForAction"],
      missing: ["Customer-reported journey outcomes"],
    },
    {
      category: "4. core differentiator",
      status: reuse ? "supported" : "partial",
      evidence: reuse
        ? ["Reusable verified evidence", "Policy-isolated receipts", "Privacy-minimization contracts"]
        : ["Policy-isolated receipts", "Privacy-minimization contracts"],
      missing: reuse ? [] : ["Sufficient reuse event volume for proof"],
    },
    {
      category: "5. stickiness/expansion",
      status: multiPolicy || productionActive ? "partial" : "unavailable",
      evidence: [
        multiPolicy ? "Multi-policy consumption observed" : "",
        productionActive ? "Production applications active" : "",
      ].filter(Boolean),
      missing: ["Long-horizon repeat production activity cohorts"],
    },
    {
      category: "6. business model/economics",
      status: "operator_input_required",
      evidence: ["Commercial model candidate metadata supported"],
      missing: ["Validated pricing model", "Unit economics cost inputs"],
    },
    {
      category: "7. revenue/ACV",
      status: "unavailable",
      evidence: [],
      missing: [REVENUE_BOUNDARY.note, "ARR", "ACV", "revenue"],
    },
    {
      category: "8. GTM/pipeline/conversion",
      status: input.conversionCounts.design_partners > 0 ? "partial" : "unavailable",
      evidence: [
        `Design partners tracked: ${input.conversionCounts.design_partners}`,
        `Production active: ${input.conversionCounts.production_active}`,
      ],
      missing: ["Pipeline dollars require verified commercial source"],
    },
    {
      category: "9. customer case study",
      status: input.caseStudyReady ? "partial" : "unavailable",
      evidence: input.caseStudyReady ? ["Pilot evidence measured fields available"] : [],
      missing: ["Customer quote", "Customer-reported ROI", "Commercial outcome"],
    },
  ];
}
