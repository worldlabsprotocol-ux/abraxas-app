// FILE: lib/partner/designPartnerProgram/designPartnerProgram.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  buildIntegrationEventRow,
  resetIntegrationEventsForTests,
} from "@/lib/partner/integrationObservability/record";
import { buildPartnerPilotSummary, resetLaunchpadActivityForTests } from "@/lib/partner/pilotEvidence";
import { resetValueEvidenceStoreForTests } from "@/lib/partner/valueEvidence";
import {
  enrollProgram,
  seedProgramForTests,
  seedCriteriaForTests,
  resetDesignPartnerStoreForTests,
  recordDecision,
  evaluateAllCriteria,
  deriveTechnicalOutcome,
  buildDesignPartnerPilotScorecard,
  resolveEffectiveProgramStatus,
  buildDesignPartnerFunnel,
  buildLostPilotIntelligence,
  buildCaseStudyArtifact,
  buildFundraisingSlideReadiness,
  deriveNextAction,
  designPartnerLeaks,
} from "@/lib/partner/designPartnerProgram";
import { buildPartnerPilotProgress } from "@/lib/partner/designPartnerProgram/partnerProgress";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";
import { VALUE_EVIDENCE_NOTICE, VALUE_EVIDENCE_VERSION } from "@/lib/partner/valueEvidence/contract";
import { DESIGN_PARTNER_NOTICE } from "@/lib/partner/designPartnerProgram/contract";
import { CAPITAL_DISCIPLINE_PRINCIPLE } from "@/lib/partner/valueEvidence/contract";

const APP: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-app",
  partner_id: "partner-a",
  application_name: "Acme",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "partner-a-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://acme.example/callback"],
  api_key_id: "key-sandbox",
  production_api_key_id: null,
  production_key_revealed_at: null,
  production_activated_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const APP_B: LaunchpadApplicationRow = { ...APP, id: "22222222-2222-2222-2222-222222222222", partner_id: "partner-b" };

function event(overrides: Partial<{ event_type: string; request_id: string; receipt_id: string; policy_id: string }> = {}) {
  return buildIntegrationEventRow({
    partnerId: APP.partner_id,
    applicationId: APP.id,
    environment: "sandbox",
    eventType: (overrides.event_type ?? "verification_request_created") as never,
    lifecycleStage: "request",
    requestId: overrides.request_id ?? "req_1",
    receiptId: overrides.receipt_id ?? null,
    policyId: overrides.policy_id ?? APP.policy_id,
    policyVersion: 1,
  });
}

function valueEvidence(events: ReturnType<typeof buildIntegrationEventRow>[] = []): ApplicationValueEvidence {
  const pilotSandbox = buildPartnerPilotSummary({ application: APP, events, activity: [], environment: "sandbox" });
  return {
    contract_version: VALUE_EVIDENCE_VERSION,
    partner_id: APP.partner_id,
    application_id: APP.id,
    notice: VALUE_EVIDENCE_NOTICE,
    lifecycle: {
      lifecycle_stage: "sandbox_started",
      technical_stage: "sandbox_started",
      commercial_stage: "none",
      stage_entered_at: APP.created_at,
      blockers: [],
      supporting_evidence: ["verification_request_created"],
    },
    pilot_sandbox: pilotSandbox,
    pilot_production: null,
    integration_velocity: {} as ApplicationValueEvidence["integration_velocity"],
    policy_expansion_sandbox: { policy_expansion_observed: false, active_policy_count: 0, policies_used: [], first_policy_used: null, first_policy_at: null, additional_policy_first_used_at: null, environment: "sandbox" },
    policy_expansion_production: { policy_expansion_observed: false, active_policy_count: 0, policies_used: [], first_policy_used: null, first_policy_at: null, additional_policy_first_used_at: null, environment: "production" },
    environment_expansion: { environment_expansion_observed: false, evidence: [] },
    usage_expansion: { usage_expansion_observed: false, periods_with_activity: 0, evidence: "" },
    expansion_valuation: { initial_policy: null, current_policy_count: 0, first_production_activity: null, most_recent_production_activity: null, reuse_observed: false, classification: "insufficient_history" },
    repeat_activity: { periods_with_verification: 0, periods_with_completed_flow: 0, repeat_integration_activity: false, active_production_periods: null, label: "monthly_active_integration" },
    unit_economics: { revenue_per_verification: "unavailable", direct_cost_per_verification: "unavailable", gross_margin: "unavailable", manual_review_rate: "unavailable", reusable_verification_rate: "unavailable", missing_inputs: [], measurable_inputs: {} },
    revenue_boundary: { arr: "unavailable", acv: "unavailable", revenue: "unavailable", note: "" },
    case_study_readiness: { integration_velocity: "missing", production_usage: "missing", verification_success: "missing", evidence_reuse: "missing", privacy_minimization: "missing", policy_expansion: "missing", customer_quote: "operator_required", customer_roi: "unavailable", commercial_status: "operator_required", measured_evidence: [], missing_evidence: [], safe_claims_today: [], partner_questions: [] },
    commercial_state: null,
    icp_profile: null,
    feature_requests: [],
    product_discipline: { principle: CAPITAL_DISCIPLINE_PRINCIPLE, total_requests: 0, reusable_count: 0, one_off_count: 0, one_off_blocking_production: 0, by_classification: {}, compounding_ratio: null },
    value_dimensions: {} as ApplicationValueEvidence["value_dimensions"],
    investor_claims: [],
  };
}

describe("design partner program", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
    resetLaunchpadActivityForTests();
    resetValueEvidenceStoreForTests();
    resetDesignPartnerStoreForTests();
  });

  it("enrolls candidate without fabricating technical state", async () => {
    const program = await enrollProgram({
      applicationId: APP.id,
      partnerId: APP.partner_id,
      primaryUseCase: "age gate",
      operatorActor: "operator",
    });
    expect(program.program_status).toBe("candidate");
    expect(program.decision_status).toBe("pending");
  });

  it("caps program status at technical evidence — cannot claim pilot_live without verification", () => {
    const program = {
      application_id: APP.id,
      partner_id: APP.partner_id,
      program_status: "pilot_live" as const,
      entered_at: APP.created_at,
      target_decision_date: null,
      primary_use_case: "age gate",
      initial_policy_pack: "age_21_retail",
      pilot_environment: "sandbox" as const,
      technical_owner_status: null,
      business_owner_status: null,
      pilot_started_at: null,
      pilot_completed_at: null,
      decision_status: "pending" as const,
      decision_reason_codes: [],
      decision_operator_summary: null,
      decision_recorded_at: null,
      technical_outcome: null,
      updated_at: APP.updated_at,
    };
    const resolved = resolveEffectiveProgramStatus({
      program,
      lifecycle: { lifecycle_stage: "prospect", technical_stage: "prospect", commercial_stage: "none", stage_entered_at: null, blockers: [], supporting_evidence: [] },
      commercialConverted: false,
    });
    expect(resolved.effective_program_status).toBe("candidate");
    expect(resolved.blockers).toContain("program_status_exceeds_technical_evidence");
  });

  it("evaluates system criteria from measured evidence", () => {
    const criteria = [{
      id: "c1",
      application_id: APP.id,
      partner_id: APP.partner_id,
      criterion_type: "first_successful_verification" as const,
      target: {},
      measurement_source: "partner_integration_events",
      operator_confirmed: false,
      operator_confirmed_at: null,
      created_at: APP.created_at,
    }];
    const events = [event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1" })];
    const evaluated = evaluateAllCriteria({
      criteria,
      pilotSandbox: buildPartnerPilotSummary({ application: APP, events, activity: [], environment: "sandbox" }),
      pilotProduction: null,
      valueEvidence: valueEvidence(events),
    });
    expect(evaluated[0]!.status).toBe("met");
    expect(evaluated[0]!.quality).toBe("system_measured");
  });

  it("keeps operator criterion as operator_asserted", () => {
    const criteria = [{
      id: "c2",
      application_id: APP.id,
      partner_id: APP.partner_id,
      criterion_type: "custom_operator_confirmed" as const,
      target: { note: "security review passed" },
      measurement_source: "operator",
      operator_confirmed: false,
      operator_confirmed_at: null,
      created_at: APP.created_at,
    }];
    const evaluated = evaluateAllCriteria({
      criteria,
      pilotSandbox: buildPartnerPilotSummary({ application: APP, events: [], activity: [], environment: "sandbox" }),
      pilotProduction: null,
      valueEvidence: valueEvidence(),
    });
    expect(evaluated[0]!.quality).toBe("unavailable");
    expect(evaluated[0]!.status).toBe("pending");
  });

  it("builds scorecard without numeric vanity score", () => {
    seedProgramForTests({
      application_id: APP.id,
      partner_id: APP.partner_id,
      program_status: "accepted",
      entered_at: APP.created_at,
      target_decision_date: null,
      primary_use_case: "age gate",
      initial_policy_pack: "age_21_retail",
      pilot_environment: "sandbox",
      technical_owner_status: null,
      business_owner_status: null,
      pilot_started_at: null,
      pilot_completed_at: null,
      decision_status: "pending",
      decision_reason_codes: [],
      decision_operator_summary: null,
      decision_recorded_at: null,
      technical_outcome: null,
      updated_at: APP.updated_at,
    });
    seedCriteriaForTests([{
      id: "c1",
      application_id: APP.id,
      partner_id: APP.partner_id,
      criterion_type: "minimum_successful_verifications",
      target: { min_count: 2 },
      measurement_source: "partner_integration_events",
      operator_confirmed: false,
      operator_confirmed_at: null,
      created_at: APP.created_at,
    }]);
    const program = {
      application_id: APP.id,
      partner_id: APP.partner_id,
      program_status: "accepted" as const,
      entered_at: APP.created_at,
      target_decision_date: null,
      primary_use_case: "age gate",
      initial_policy_pack: "age_21_retail",
      pilot_environment: "sandbox" as const,
      technical_owner_status: null,
      business_owner_status: null,
      pilot_started_at: null,
      pilot_completed_at: null,
      decision_status: "pending" as const,
      decision_reason_codes: [],
      decision_operator_summary: null,
      decision_recorded_at: null,
      technical_outcome: null,
      updated_at: APP.updated_at,
    };
    const scorecard = buildDesignPartnerPilotScorecard({
      program,
      criteria: [{
        id: "c1",
        application_id: APP.id,
        partner_id: APP.partner_id,
        criterion_type: "minimum_successful_verifications",
        target: { min_count: 2 },
        measurement_source: "partner_integration_events",
        operator_confirmed: false,
        operator_confirmed_at: null,
        created_at: APP.created_at,
      }],
      valueEvidence: valueEvidence([event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1" })]),
    });
    expect(scorecard).not.toBeNull();
    expect(scorecard!.criteria_met + scorecard!.criteria_not_met + scorecard!.criteria_pending).toBeGreaterThan(0);
    expect(JSON.stringify(scorecard)).not.toMatch(/\/100|score:\s*\d+/i);
  });

  it("separates pilot completion from commercial conversion", async () => {
    seedProgramForTests({
      application_id: APP.id,
      partner_id: APP.partner_id,
      program_status: "pilot_complete",
      entered_at: APP.created_at,
      target_decision_date: null,
      primary_use_case: null,
      initial_policy_pack: null,
      pilot_environment: "sandbox",
      technical_owner_status: null,
      business_owner_status: null,
      pilot_started_at: "2026-02-01T00:00:00.000Z",
      pilot_completed_at: "2026-03-01T00:00:00.000Z",
      decision_status: "pending",
      decision_reason_codes: [],
      decision_operator_summary: null,
      decision_recorded_at: null,
      technical_outcome: "criteria_met",
      updated_at: APP.updated_at,
    });
    const program = await recordDecision({
      applicationId: APP.id,
      partnerId: APP.partner_id,
      decisionStatus: "not_converted",
      reasonCodes: ["pricing"],
      technicalOutcome: "criteria_met",
      operatorActor: "operator",
    });
    expect(program.pilot_completed_at).toBeTruthy();
    expect(program.decision_status).toBe("not_converted");
    expect(program.technical_outcome).toBe("criteria_met");
  });

  it("blocks converted decision without production activation", async () => {
    seedProgramForTests({
      application_id: APP.id,
      partner_id: APP.partner_id,
      program_status: "pilot_complete",
      entered_at: APP.created_at,
      target_decision_date: null,
      primary_use_case: null,
      initial_policy_pack: null,
      pilot_environment: "sandbox",
      technical_owner_status: null,
      business_owner_status: null,
      pilot_started_at: "2026-02-01T00:00:00.000Z",
      pilot_completed_at: "2026-03-01T00:00:00.000Z",
      decision_status: "pending",
      decision_reason_codes: [],
      decision_operator_summary: null,
      decision_recorded_at: null,
      technical_outcome: null,
      updated_at: APP.updated_at,
    });
    await expect(recordDecision({
      applicationId: APP.id,
      partnerId: APP.partner_id,
      decisionStatus: "converted",
      reasonCodes: [],
      operatorActor: "operator",
    })).rejects.toThrow();
  });

  it("classifies lost pilots into reusable vs one-off product gaps", () => {
    const intel = buildLostPilotIntelligence({
      programs: [{
        application_id: APP.id,
        partner_id: APP.partner_id,
        program_status: "not_converted",
        entered_at: APP.created_at,
        target_decision_date: null,
        primary_use_case: null,
        initial_policy_pack: null,
        pilot_environment: "sandbox",
        technical_owner_status: null,
        business_owner_status: null,
        pilot_started_at: null,
        pilot_completed_at: "2026-03-01T00:00:00.000Z",
        decision_status: "not_converted",
        decision_reason_codes: ["custom_feature_dependency"],
        decision_operator_summary: null,
        decision_recorded_at: "2026-03-02T00:00:00.000Z",
        technical_outcome: "criteria_partially_met",
        updated_at: APP.updated_at,
      }],
      featureRequests: [
        { id: "f1", partner_id: APP.partner_id, application_id: APP.id, title: "Custom UI", classification: "custom_one_off", reusable_across_market: "no", blocks_production: true, status: "open", requested_by_partner: "partner-a" },
        { id: "f2", partner_id: APP.partner_id, application_id: APP.id, title: "Residency policy", classification: "reusable_policy_capability", reusable_across_market: "yes", blocks_production: false, status: "open", requested_by_partner: "partner-a" },
      ],
    });
    expect(intel.product_gaps.one_off).toBe(1);
    expect(intel.product_gaps.reusable).toBe(1);
    expect(intel.discipline_signals[0]!.would_compound_platform).toBe(false);
  });

  it("exposes funnel counts with sample-size warnings", () => {
    const programs = [{
      application_id: APP.id,
      partner_id: APP.partner_id,
      program_status: "accepted" as const,
      entered_at: APP.created_at,
      target_decision_date: null,
      primary_use_case: null,
      initial_policy_pack: null,
      pilot_environment: "sandbox" as const,
      technical_owner_status: null,
      business_owner_status: null,
      pilot_started_at: null,
      pilot_completed_at: null,
      decision_status: "pending" as const,
      decision_reason_codes: [],
      decision_operator_summary: null,
      decision_recorded_at: null,
      technical_outcome: null,
      updated_at: APP.updated_at,
    }];
    const ev = valueEvidence([event()]);
    const funnel = buildDesignPartnerFunnel({
      programs,
      scorecards: [null],
      valueEvidence: [ev],
    });
    expect(funnel.counts.candidates).toBeGreaterThanOrEqual(1);
    expect(funnel.integration_to_verification.sample_size_warning).toBe(true);
    expect(funnel.integration_to_verification.denominator).toBeDefined();
  });

  it("requires permissions before case study publication", () => {
    const artifact = buildCaseStudyArtifact({
      program: {
        application_id: APP.id,
        partner_id: APP.partner_id,
        program_status: "pilot_complete",
        entered_at: APP.created_at,
        target_decision_date: null,
        primary_use_case: "age gate",
        initial_policy_pack: "age_21_retail",
        pilot_environment: "sandbox",
        technical_owner_status: null,
        business_owner_status: null,
        pilot_started_at: "2026-02-01T00:00:00.000Z",
        pilot_completed_at: "2026-03-01T00:00:00.000Z",
        decision_status: "pending",
        decision_reason_codes: [],
        decision_operator_summary: null,
        decision_recorded_at: null,
        technical_outcome: "criteria_met",
        updated_at: APP.updated_at,
      },
      valueEvidence: valueEvidence([event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1" })]),
      scorecard: null,
      permissions: {
        application_id: APP.id,
        partner_id: APP.partner_id,
        company_name_permission: "pending",
        quote_permission: "pending",
        metrics_permission: "pending",
        logo_permission: "pending",
        public_case_study_permission: "pending",
        updated_at: APP.updated_at,
      },
      customerReported: [],
    });
    expect(artifact.publishability.status).toBe("blocked");
    expect(artifact.partner_identity.logo_allowed).toBe(false);
    expect(artifact.quote.permission).toBe("pending");
  });

  it("keeps revenue slide unavailable in fundraising readiness", () => {
    const slides = buildFundraisingSlideReadiness({
      funnel: { candidates: 1, accepted_design_partners: 1, integration_started: 0, first_successful_verification: 0, pilot_live: 0, pilot_complete: 0, production_active: 0, commercial_review: 0, converted: 0 },
      permissions: [],
      valueEvidence: [valueEvidence()],
      portfolioEvidence: {
        accepted: 1, integrated: 0, successful_verification: 0, pilot_complete: 0, production_active: 0, converted: 0,
        median_time_to_first_verification_ms: null, median_time_to_production_ms: null, median_time_to_commercial_decision_ms: null,
        policy_expansion_observed: 0, repeat_production_activity_observed: 0, reuse_observed: 0,
        case_studies: { ready: 0, partial: 0, blocked: 1 }, provenance: "test",
      },
    });
    const revenue = slides.find((s) => s.slide.includes("Revenue"));
    expect(revenue?.status).toBe("unavailable");
  });

  it("derives deterministic next action", () => {
    const action = deriveNextAction({
      program: {
        application_id: APP.id,
        partner_id: APP.partner_id,
        program_status: "pilot_complete",
        entered_at: APP.created_at,
        target_decision_date: null,
        primary_use_case: null,
        initial_policy_pack: null,
        pilot_environment: "sandbox",
        technical_owner_status: null,
        business_owner_status: null,
        pilot_started_at: "2026-02-01T00:00:00.000Z",
        pilot_completed_at: "2026-03-01T00:00:00.000Z",
        decision_status: "pending",
        decision_reason_codes: [],
        decision_operator_summary: null,
        decision_recorded_at: null,
        technical_outcome: null,
        updated_at: APP.updated_at,
      },
      effectiveStatus: "pilot_complete",
      pilotSandbox: buildPartnerPilotSummary({ application: APP, events: [], activity: [], environment: "sandbox" }),
      criteria: [],
      blockers: [],
    });
    expect(action).toBe("record_commercial_decision");
  });

  it("enforces tenant isolation in partner progress view", () => {
    const progress = buildPartnerPilotProgress({
      contract_version: "1.0.0",
      notice: DESIGN_PARTNER_NOTICE,
      program: { application_id: APP.id, partner_id: "partner-a", program_status: "accepted", entered_at: APP.created_at, target_decision_date: null, primary_use_case: null, initial_policy_pack: null, pilot_environment: "sandbox", technical_owner_status: null, business_owner_status: null, pilot_started_at: null, pilot_completed_at: null, decision_status: "pending", decision_reason_codes: [], decision_operator_summary: null, decision_recorded_at: null, technical_outcome: null, updated_at: APP.updated_at },
      value_evidence: valueEvidence(),
      scorecard: null,
      time_to_conversion: null,
      case_study_artifact: null,
      case_study_permissions: null,
      customer_reported_evidence: [],
      partner_next_action: "complete_sandbox_integration",
    });
    expect(progress.enrolled).toBe(true);
    expect(JSON.stringify(progress)).not.toContain("partner-b");
    expect(JSON.stringify(progress)).not.toContain("fundraising");
    expect(JSON.stringify(progress)).not.toContain("ICP");
  });

  it("rejects PII in design partner payloads", () => {
    expect(designPartnerLeaks({ legal_name: "Jane Doe" }).length).toBeGreaterThan(0);
    expect(designPartnerLeaks({ wallet_address: "0xabc" }).length).toBeGreaterThan(0);
  });

  it("supports arbitrary application enrollment without hard-coded Good Trouble", async () => {
    const program = await enrollProgram({
      applicationId: APP_B.id,
      partnerId: APP_B.partner_id,
      operatorActor: "operator",
    });
    expect(program.application_id).toBe(APP_B.id);
    expect(program.partner_id).toBe("partner-b");
  });

  it("derives technical outcome from criteria thresholds", () => {
    const met = deriveTechnicalOutcome([
      { criterion_type: "first_successful_verification", target: {}, measurement_source: "", status: "met", measured_value: 1, quality: "system_measured", evaluated_at: null },
    ]);
    const notMet = deriveTechnicalOutcome([
      { criterion_type: "minimum_successful_verifications", target: { min_count: 5 }, measurement_source: "", status: "not_met", measured_value: 1, quality: "system_measured", evaluated_at: null },
    ]);
    expect(met).toBe("criteria_met");
    expect(notMet).toBe("criteria_not_met");
  });
});
