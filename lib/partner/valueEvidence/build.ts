// FILE: lib/partner/valueEvidence/build.ts
// Assemble full value evidence for one application or portfolio.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { loadIntegrationEvents, loadLaunchpadActivity } from "@/lib/partner/pilotEvidence/load";
import { loadPartnerPilotSummary } from "@/lib/partner/pilotEvidence/loadContext";
import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import {
  loadCommercialState,
  loadIcpProfile,
  listFeatureRequests,
  type CommercialStateRow,
  type FeatureRequestRow,
  type IcpProfileRow,
} from "./store";
import { resolvePartnerLifecycle } from "./lifecycle";
import { computeIntegrationVelocity } from "./velocity";
import { buildConversionSnapshot, computeWinRate } from "./conversion";
import {
  computePolicyExpansion,
  computeEnvironmentExpansion,
  computeUsageExpansion,
  computeExpansionValuation,
} from "./expansion";
import { computeRepeatIntegrationActivity } from "./retention";
import { buildUnitEconomicsReadiness, REVENUE_BOUNDARY } from "./unitEconomics";
import { buildCaseStudyReadiness } from "./caseStudyReadiness";
import { buildFundraisingEvidenceMatrix } from "./fundraising";
import { buildInvestorClaimRegistry } from "./investorClaims";
import { buildAbraxasValueModel } from "./valueModel";
import { summarizeProductDiscipline } from "./productDiscipline";
import { assessNetworkReuseEvidence } from "./networkEvidence";
import { VALUE_EVIDENCE_NOTICE, VALUE_EVIDENCE_VERSION } from "./contract";
import type { PartnerLifecycleResolution } from "./contract";

export interface ApplicationValueEvidence {
  contract_version: typeof VALUE_EVIDENCE_VERSION;
  partner_id: string;
  application_id: string;
  notice: typeof VALUE_EVIDENCE_NOTICE;
  lifecycle: PartnerLifecycleResolution;
  pilot_sandbox: PartnerPilotSummary;
  pilot_production: PartnerPilotSummary | null;
  integration_velocity: ReturnType<typeof computeIntegrationVelocity>;
  policy_expansion_sandbox: ReturnType<typeof computePolicyExpansion>;
  policy_expansion_production: ReturnType<typeof computePolicyExpansion>;
  environment_expansion: ReturnType<typeof computeEnvironmentExpansion>;
  usage_expansion: ReturnType<typeof computeUsageExpansion>;
  expansion_valuation: ReturnType<typeof computeExpansionValuation>;
  repeat_activity: ReturnType<typeof computeRepeatIntegrationActivity>;
  unit_economics: ReturnType<typeof buildUnitEconomicsReadiness>;
  revenue_boundary: typeof REVENUE_BOUNDARY;
  case_study_readiness: ReturnType<typeof buildCaseStudyReadiness>;
  commercial_state: CommercialStateRow | null;
  icp_profile: IcpProfileRow | null;
  feature_requests: FeatureRequestRow[];
  product_discipline: ReturnType<typeof summarizeProductDiscipline>;
  value_dimensions: ReturnType<typeof buildAbraxasValueModel>;
  investor_claims: ReturnType<typeof buildInvestorClaimRegistry>;
}

export interface PortfolioValueEvidence {
  contract_version: typeof VALUE_EVIDENCE_VERSION;
  notice: typeof VALUE_EVIDENCE_NOTICE;
  generated_at: string;
  applications: ApplicationValueEvidence[];
  conversion: ReturnType<typeof buildConversionSnapshot>;
  gtm_funnel: ReturnType<typeof buildConversionSnapshot>["counts"];
  win_rate: ReturnType<typeof computeWinRate>;
  network_reuse: ReturnType<typeof assessNetworkReuseEvidence>;
  product_discipline: ReturnType<typeof summarizeProductDiscipline>;
  fundraising_matrix: ReturnType<typeof buildFundraisingEvidenceMatrix>;
  capital_discipline_view: {
    partners_active: number;
    production_partners: number;
    policies_actively_consumed: number;
    one_off_feature_requests: number;
    reusable_feature_requests: number;
    production_blockers: number;
    case_study_ready_pilots: number;
  };
}

export async function buildApplicationValueEvidence(input: {
  application: LaunchpadApplicationRow;
  from?: Date | null;
  to?: Date | null;
}): Promise<ApplicationValueEvidence> {
  const pilotSandbox = await loadPartnerPilotSummary({
    application: input.application,
    environment: "sandbox",
    from: input.from,
    to: input.to,
  });
  const pilotProduction = input.application.production_activated_at
    ? await loadPartnerPilotSummary({
      application: input.application,
      environment: "production",
      from: input.from,
      to: input.to,
    })
    : null;

  const events = await loadIntegrationEvents({
    partnerId: input.application.partner_id,
    applicationId: input.application.id,
    from: input.from,
    to: input.to,
  });
  const activity = await loadLaunchpadActivity({
    partnerId: input.application.partner_id,
    applicationId: input.application.id,
    from: input.from,
    to: input.to,
  });

  const commercial = await loadCommercialState(input.application.id);
  const icp = await loadIcpProfile(input.application.id);
  const features = await listFeatureRequests(input.application.partner_id);

  const lifecycle = resolvePartnerLifecycle({
    application: input.application,
    pilotSummarySandbox: pilotSandbox,
    pilotSummaryProduction: pilotProduction,
    activity,
    commercial,
  });

  const velocity = computeIntegrationVelocity({ application: input.application, events, activity });
  const policySandbox = computePolicyExpansion(events, "sandbox");
  const policyProduction = computePolicyExpansion(events, "production");
  const envExpansion = computeEnvironmentExpansion({
    sandboxSummary: pilotSandbox,
    productionSummary: pilotProduction,
    productionActivated: Boolean(input.application.production_activated_at),
  });
  const usageExpansion = computeUsageExpansion(events, "production");
  const expansionValuation = computeExpansionValuation({
    policyExpansionProduction: policyProduction,
    sandboxSummary: pilotSandbox,
    productionSummary: pilotProduction,
    productionActivated: Boolean(input.application.production_activated_at),
  });
  const repeatActivity = computeRepeatIntegrationActivity({ events, environment: "sandbox" });
  const unitEconomics = buildUnitEconomicsReadiness(pilotSandbox, pilotProduction);
  const caseStudy = buildCaseStudyReadiness({
    pilotSandbox,
    pilotProduction,
    velocity,
    policyExpansion: policyProduction,
    commercial,
  });
  const productDiscipline = summarizeProductDiscipline(features.filter((f) => f.application_id === input.application.id));
  const valueDimensions = buildAbraxasValueModel({
    pilotSandbox,
    pilotProduction,
    lifecycle,
    velocity,
    policyExpansionProduction: policyProduction,
    unitEconomics,
    repeatActivity,
  });
  const investorClaims = buildInvestorClaimRegistry({
    pilotSandbox,
    pilotProduction,
    velocity,
    conversionCounts: {
      design_partners: 1,
      sandbox_started: lifecycle.technical_stage !== "prospect" ? 1 : 0,
      sandbox_success: ["integration_verified", "pilot_live", "pilot_evidence_available", "production_requested", "production_approved", "production_active"].includes(lifecycle.technical_stage) ? 1 : 0,
      pilot_live: ["pilot_live", "pilot_evidence_available", "production_requested", "production_approved", "production_active"].includes(lifecycle.technical_stage) ? 1 : 0,
      production_requested: ["production_requested", "production_approved", "production_active"].includes(lifecycle.technical_stage) ? 1 : 0,
      production_active: lifecycle.technical_stage === "production_active" ? 1 : 0,
      commercially_converted: commercial?.commercial_converted ? 1 : 0,
    },
    policyExpansionCount: policyProduction.policy_expansion_observed ? 1 : 0,
  });

  return {
    contract_version: VALUE_EVIDENCE_VERSION,
    partner_id: input.application.partner_id,
    application_id: input.application.id,
    notice: VALUE_EVIDENCE_NOTICE,
    lifecycle,
    pilot_sandbox: pilotSandbox,
    pilot_production: pilotProduction,
    integration_velocity: velocity,
    policy_expansion_sandbox: policySandbox,
    policy_expansion_production: policyProduction,
    environment_expansion: envExpansion,
    usage_expansion: usageExpansion,
    expansion_valuation: expansionValuation,
    repeat_activity: repeatActivity,
    unit_economics: unitEconomics,
    revenue_boundary: REVENUE_BOUNDARY,
    case_study_readiness: caseStudy,
    commercial_state: commercial,
    icp_profile: icp,
    feature_requests: features.filter((f) => f.application_id === input.application.id),
    product_discipline: productDiscipline,
    value_dimensions: valueDimensions,
    investor_claims: investorClaims,
  };
}

export async function buildPortfolioValueEvidence(input: {
  applications: LaunchpadApplicationRow[];
  from?: Date | null;
  to?: Date | null;
}): Promise<PortfolioValueEvidence> {
  const apps: ApplicationValueEvidence[] = [];
  for (const application of input.applications) {
    apps.push(await buildApplicationValueEvidence({ application, from: input.from, to: input.to }));
  }

  const resolutions = apps.map((a) => a.lifecycle);
  const commercialStates = apps.map((a) => a.commercial_state).filter((c): c is CommercialStateRow => c != null);
  const conversion = buildConversionSnapshot({ resolutions, commercialStates });
  const allFeatures = apps.flatMap((a) => a.feature_requests);
  const discipline = summarizeProductDiscipline(allFeatures);
  const network = assessNetworkReuseEvidence({ summaries: apps.map((a) => a.pilot_sandbox) });
  const caseStudyReady = apps.some((a) => a.case_study_readiness.measured_evidence.length >= 3);
  const referenceApp = apps.find((a) => a.lifecycle.technical_stage !== "prospect") ?? apps[0] ?? null;
  const emptyPolicyExpansion = {
    policy_expansion_observed: false,
    active_policy_count: 0,
    policies_used: [] as string[],
    first_policy_used: null,
    first_policy_at: null,
    additional_policy_first_used_at: null,
    environment: "production" as const,
  };
  const fundraising = buildFundraisingEvidenceMatrix({
    valueDimensions: referenceApp?.value_dimensions ?? ({} as ApplicationValueEvidence["value_dimensions"]),
    pilotSandbox: referenceApp?.pilot_sandbox ?? null,
    policyExpansion: referenceApp?.policy_expansion_production ?? emptyPolicyExpansion,
    conversionCounts: conversion.counts,
    caseStudyReady,
  });

  return {
    contract_version: VALUE_EVIDENCE_VERSION,
    notice: VALUE_EVIDENCE_NOTICE,
    generated_at: new Date().toISOString(),
    applications: apps,
    conversion,
    gtm_funnel: conversion.counts,
    win_rate: computeWinRate(commercialStates),
    network_reuse: network,
    product_discipline: discipline,
    fundraising_matrix: fundraising,
    capital_discipline_view: {
      partners_active: apps.filter((a) => a.lifecycle.technical_stage !== "prospect").length,
      production_partners: apps.filter((a) => a.lifecycle.technical_stage === "production_active").length,
      policies_actively_consumed: new Set(apps.flatMap((a) => a.policy_expansion_production.policies_used)).size,
      one_off_feature_requests: discipline.one_off_count,
      reusable_feature_requests: discipline.reusable_count,
      production_blockers: allFeatures.filter((f) => f.blocks_production).length,
      case_study_ready_pilots: apps.filter((a) => a.case_study_readiness.measured_evidence.length >= 3).length,
    },
  };
}
