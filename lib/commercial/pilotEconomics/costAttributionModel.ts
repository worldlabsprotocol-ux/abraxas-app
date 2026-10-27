// FILE: lib/commercial/pilotEconomics/costAttributionModel.ts
// Build 876 — separate baseline vs variable verification economics (no fabricated costs).

import { auditCommercialMeteringCapabilities } from "@/lib/partner/universalIntegration/commercialMeteringAudit";

export type CostBucketId =
  | "baseline_platform"
  | "verification_issuance"
  | "verification_portable_export"
  | "verification_independent_eval"
  | "evidence_storage"
  | "monitoring_observability"
  | "pilot_support_engineering";

export type CostBucketDefinition = {
  id: CostBucketId;
  label: string;
  description: string;
  typicallyFixedOrVariable: "fixed" | "variable" | "mixed";
  attributionSource: string;
  marginalToVerification: boolean;
};

export type PilotEconomicsObservation = {
  bucket: CostBucketId;
  period: string;
  amount_usd: number | null;
  attribution_method: string;
  notes: string;
};

/** Framework only — founder/operator fills observations outside CI. */
export function describeCostAttributionBuckets(): CostBucketDefinition[] {
  return [
    {
      id: "baseline_platform",
      label: "Baseline platform",
      description: "Always-on hosting, database minimum, CDN, deployment protection — exists without pilot traffic",
      typicallyFixedOrVariable: "fixed",
      attributionSource: "Vercel/Supabase/sovereign Postgres monthly invoice (baseline slice)",
      marginalToVerification: false,
    },
    {
      id: "verification_issuance",
      label: "Verification issuance",
      description: "Partner handoff, holder qualification, receipt signing side effects per approved outcome",
      typicallyFixedOrVariable: "variable",
      attributionSource: "Meter: partner_flow_receipt_issued; correlate with function duration logs if available",
      marginalToVerification: true,
    },
    {
      id: "verification_portable_export",
      label: "Portable export",
      description: "Portable bundle assembly and HTTP export for independent verify",
      typicallyFixedOrVariable: "variable",
      attributionSource: "partner_api_call on export routes + runtime logs (no PII)",
      marginalToVerification: true,
    },
    {
      id: "verification_independent_eval",
      label: "Independent evaluation (integrator)",
      description: "CPU on partner infrastructure running @abraxas/independent-verifier — not Abraxas COGS",
      typicallyFixedOrVariable: "variable",
      attributionSource: "Partner-reported; Abraxas does not meter integrator runtime",
      marginalToVerification: false,
    },
    {
      id: "evidence_storage",
      label: "Evidence storage",
      description: "Receipt and status persistence growth attributable to pilot partner",
      typicallyFixedOrVariable: "mixed",
      attributionSource: "DB storage metrics filtered by partner_id / application_id where possible",
      marginalToVerification: true,
    },
    {
      id: "monitoring_observability",
      label: "Monitoring",
      description: "Logs, metrics, alerting allocated to pilot window",
      typicallyFixedOrVariable: "mixed",
      attributionSource: "Observability vendor line items (privacy-preserving; no holder payloads)",
      marginalToVerification: false,
    },
    {
      id: "pilot_support_engineering",
      label: "Pilot support",
      description: "Founder/engineering time on integration blockers (tracked as hours, not auto-billed)",
      typicallyFixedOrVariable: "variable",
      attributionSource: "Operator time log per pilot application_id",
      marginalToVerification: false,
    },
  ];
}

export function emptyPilotEconomicsObservations(): PilotEconomicsObservation[] {
  return describeCostAttributionBuckets().map((b) => ({
    bucket: b.id,
    period: "unrecorded",
    amount_usd: null,
    attribution_method: b.attributionSource,
    notes: "Fill from operator billing export — never infer in repo",
  }));
}

export function auditPilotEconomicsReadiness(): {
  meteringSignals: ReturnType<typeof auditCommercialMeteringCapabilities>;
  blendedCostWarning: string;
  marginalCostGuidance: string;
  missingAttribution: string[];
} {
  const meteringSignals = auditCommercialMeteringCapabilities();
  return {
    meteringSignals,
    blendedCostWarning:
      "Total Vercel + Supabase bill ÷ receipt count is a blended average only; it mixes baseline_platform with variable issuance and storage.",
    marginalCostGuidance:
      "Contribution margin requires baseline_platform subtracted (or held constant) before dividing variable buckets by partner_metering_events for the pilot application.",
    missingAttribution: [
      "Automated split of Vercel function cost per route (operator export)",
      "Per-application storage attribution on shared Demo DB",
      "Integrator-side verify CPU (partner-owned)",
    ],
  };
}
