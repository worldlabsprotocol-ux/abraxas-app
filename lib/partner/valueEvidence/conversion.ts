// FILE: lib/partner/valueEvidence/conversion.ts
// Pilot-to-production conversion counts and rates.

import type { PartnerLifecycleResolution } from "./contract";
import type { SampleSizedRate } from "./contract";
import type { CommercialStateRow } from "./store";

export interface ConversionCounts {
  design_partners: number;
  sandbox_started: number;
  sandbox_success: number;
  pilot_live: number;
  production_requested: number;
  production_active: number;
  commercially_converted: number;
}

export interface PartnerConversionSnapshot {
  counts: ConversionCounts;
  technical_production_conversion: SampleSizedRate;
  commercial_conversion: SampleSizedRate;
}

const TECH_ORDER = [
  "sandbox_started",
  "integration_verified",
  "pilot_live",
  "production_requested",
  "production_active",
] as const;

function atLeast(stage: string, target: string, resolutions: PartnerLifecycleResolution[]): number {
  const targetIdx = TECH_ORDER.indexOf(target as typeof TECH_ORDER[number]);
  if (targetIdx < 0) return resolutions.filter((r) => r.technical_stage === stage).length;
  return resolutions.filter((r) => {
    const idx = TECH_ORDER.indexOf(r.technical_stage as typeof TECH_ORDER[number]);
    return idx >= 0 && idx >= targetIdx;
  }).length;
}

export function buildConversionSnapshot(input: {
  resolutions: PartnerLifecycleResolution[];
  commercialStates: CommercialStateRow[];
}): PartnerConversionSnapshot {
  const designPartners = input.resolutions.filter((r) =>
    r.technical_stage !== "prospect" || input.commercialStates.some((c) => c.design_partner_status === "design_partner"),
  ).length;

  const counts: ConversionCounts = {
    design_partners: designPartners,
    sandbox_started: input.resolutions.filter((r) =>
      ["sandbox_started", "integration_verified", "pilot_ready", "pilot_live", "pilot_evidence_available", "production_requested", "production_approved", "production_active"].includes(r.technical_stage),
    ).length,
    sandbox_success: input.resolutions.filter((r) =>
      ["integration_verified", "pilot_live", "pilot_evidence_available", "production_requested", "production_approved", "production_active"].includes(r.technical_stage),
    ).length,
    pilot_live: input.resolutions.filter((r) =>
      ["pilot_live", "pilot_evidence_available", "production_requested", "production_approved", "production_active"].includes(r.technical_stage),
    ).length,
    production_requested: input.resolutions.filter((r) =>
      ["production_requested", "production_approved", "production_active"].includes(r.technical_stage),
    ).length,
    production_active: input.resolutions.filter((r) => r.technical_stage === "production_active").length,
    commercially_converted: input.commercialStates.filter((c) => c.commercial_converted).length,
  };

  const started = counts.sandbox_started;
  const prodActive = counts.production_active;
  const commercialConverted = counts.commercially_converted;

  return {
    counts,
    technical_production_conversion: {
      numerator: prodActive,
      denominator: started,
      rate: started > 0 ? Number((prodActive / started).toFixed(4)) : null,
      sample_size_warning: started < 5,
    },
    commercial_conversion: {
      numerator: commercialConverted,
      denominator: designPartners,
      rate: designPartners > 0 ? Number((commercialConverted / designPartners).toFixed(4)) : null,
      sample_size_warning: designPartners < 5,
    },
  };
}

export function computeWinRate(commercialStates: CommercialStateRow[]): SampleSizedRate & {
  wins: number;
  losses: number;
  resolved: number;
  open: number;
} {
  const wins = commercialStates.filter((c) => c.commercial_converted).length;
  const losses = commercialStates.filter((c) => c.commercial_declined || c.design_partner_status === "not_converted").length;
  const resolved = wins + losses;
  const open = commercialStates.length - resolved;
  return {
    wins,
    losses,
    resolved,
    open,
    numerator: wins,
    denominator: resolved,
    rate: resolved > 0 ? Number((wins / resolved).toFixed(4)) : null,
    sample_size_warning: resolved < 5,
  };
}
