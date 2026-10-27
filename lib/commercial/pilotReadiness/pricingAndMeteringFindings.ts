// FILE: lib/commercial/pilotReadiness/pricingAndMeteringFindings.ts
// Build 875 — economics from existing metering + plan contract (hypotheses ≠ willingness to pay).

import { auditCommercialMeteringCapabilities } from "@/lib/partner/universalIntegration/commercialMeteringAudit";
import {
  PARTNER_COMMERCIAL_PLANS,
  estimatePartnerCommercialUsage,
  type PartnerCommercialPlanId,
} from "@/lib/partner/partnerCommercialPlans";

export type PricingHypothesis = {
  id: string;
  model: string;
  billableUnit: string;
  meteringSignal: string;
  exampleEstimateNote: string;
  willingnessToPayValidated: false;
};

export type InfrastructureCostFinding = {
  id: string;
  status: "observed_in_repo" | "requires_operator_billing_export";
  detail: string;
};

export function buildPricingHypotheses(): PricingHypothesis[] {
  const launch = PARTNER_COMMERCIAL_PLANS.launch;
  const scale = PARTNER_COMMERCIAL_PLANS.scale;
  return [
    {
      id: "outcome_receipt_usage",
      model: "Usage-based on approved verification receipts",
      billableUnit: "partner_flow_receipt_issued (idempotent per receipt_id)",
      meteringSignal: "partner_metering_events + maybeRecordPartnerFlowReceiptMetering",
      exampleEstimateNote: `Launch plan reference: ${launch.included_receipts?.toLocaleString()} receipts included; $${((launch.receipt_overage_cents ?? 0) / 100).toFixed(2)} overage per receipt (estimate only in product)`,
      willingnessToPayValidated: false,
    },
    {
      id: "api_call_usage",
      model: "Authenticated partner API call volume",
      billableUnit: "partner_api_call (deduped key excludes public receipt reads)",
      meteringSignal: "partner_metering_events + partner_api_usage",
      exampleEstimateNote: `Launch plan reference: ${launch.included_api_calls?.toLocaleString()} API calls included; $${((launch.api_overage_per_thousand_cents ?? 0) / 100).toFixed(2)} per 1k overage`,
      willingnessToPayValidated: false,
    },
    {
      id: "institutional_commitment",
      model: "Monthly platform fee + included outcome volume (Launch / Scale tiers)",
      billableUnit: "30-day plan window with included receipts + API calls",
      meteringSignal: "estimatePartnerCommercialUsage (estimate_only: true — no collection)",
      exampleEstimateNote: `Scale reference base $${((scale.monthly_base_cents ?? 0) / 100).toLocaleString()}/mo — not validated against buyer budgets`,
      willingnessToPayValidated: false,
    },
    {
      id: "pilot_fixed_fee",
      model: "Fixed-fee scoped paid pilot (commercial validation track)",
      billableUnit: "Pilot period + success criteria (contractual, outside product billing)",
      meteringSignal: "Manual pilot invoice / evaluation agreement — no Stripe/subscription in repo",
      exampleEstimateNote: "Pilot fee should cover support boundary + Demo infra; amount requires WTP interviews",
      willingnessToPayValidated: false,
    },
  ];
}

export function sampleCommercialEstimateForPilotVolume(input: {
  approvedReceipts: number;
  authenticatedApiCalls: number;
  planId?: Extract<PartnerCommercialPlanId, "launch" | "scale">;
}) {
  const planId = input.planId ?? "launch";
  return estimatePartnerCommercialUsage({
    planId,
    approvedReceipts: input.approvedReceipts,
    authenticatedApiCalls: input.authenticatedApiCalls,
  });
}

export function auditMeteringAndCostFindings(): {
  meteringCapabilities: ReturnType<typeof auditCommercialMeteringCapabilities>;
  infrastructureCost: InfrastructureCostFinding[];
  commercialBlockers: string[];
} {
  const meteringCapabilities = auditCommercialMeteringCapabilities();
  return {
    meteringCapabilities,
    infrastructureCost: [
      {
        id: "vercel_supabase_operator_bills",
        status: "requires_operator_billing_export",
        detail:
          "No in-repo COGS dashboard. Unit economics require founder export of Vercel/Supabase (and sovereign Postgres if used) divided by pilot metering counts.",
      },
      {
        id: "metering_pii_free",
        status: "observed_in_repo",
        detail: "partnerMetering.ts forbids wallet/email fields in metering payloads — suitable for usage-based billing signals.",
      },
      {
        id: "reconciliation_etl",
        status: "requires_operator_billing_export",
        detail: "commercialMeteringAudit: no dedicated billing reconciliation job — partner_api_usage + partner_metering_events need external ETL for invoices.",
      },
    ],
    commercialBlockers: [
      "No validated willingness to pay from institutional interviews (Build 875 gate)",
      "No signed paid pilot contracts recorded in repo",
      "Production metering DDL suspended per BUILD_812 — sovereign persistence path for production billing",
      "Third-party security assessment incomplete (Build 874)",
      "Enterprise MSA/DPA pack incomplete (commercial gap assessment)",
      "Collection status: estimate_only in partnerCommercialPlans — payment collection not enabled in product",
    ],
  };
}
