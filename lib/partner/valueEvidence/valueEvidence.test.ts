// FILE: lib/partner/valueEvidence/valueEvidence.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  buildIntegrationEventRow,
  resetIntegrationEventsForTests,
} from "@/lib/partner/integrationObservability/record";
import {
  buildPartnerPilotSummary,
  recordLaunchpadActivityForTests,
  resetLaunchpadActivityForTests,
} from "@/lib/partner/pilotEvidence";
import {
  buildConversionSnapshot,
  computeEnvironmentExpansion,
  computeIntegrationVelocity,
  computePolicyExpansion,
  computeRepeatIntegrationActivity,
  computeWinRate,
  resolvePartnerLifecycle,
  buildUnitEconomicsReadiness,
  buildCaseStudyReadiness,
  buildFundraisingEvidenceMatrix,
  buildInvestorClaimRegistry,
  summarizeProductDiscipline,
  validateCommercialStatePatch,
  upsertCommercialState,
  seedCommercialStateForTests,
  seedFeatureRequestForTests,
  resetValueEvidenceStoreForTests,
  REVENUE_BOUNDARY,
  valueEvidenceLeaks,
  buildAbraxasValueModel,
} from "@/lib/partner/valueEvidence";

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

const APP_B: LaunchpadApplicationRow = {
  ...APP,
  id: "22222222-2222-2222-2222-222222222222",
  partner_id: "partner-b",
  public_slug: "beta-app",
};

function event(
  overrides: Partial<ReturnType<typeof buildIntegrationEventRow>> & {
    event_type?: string;
    request_id?: string | null;
    receipt_id?: string | null;
    policy_id?: string | null;
    environment?: "sandbox" | "production";
    created_at?: string;
  },
) {
  const row = buildIntegrationEventRow({
    partnerId: APP.partner_id,
    applicationId: APP.id,
    environment: overrides.environment ?? "sandbox",
    eventType: (overrides.event_type ?? "verification_request_created") as never,
    lifecycleStage: "request",
    requestId: overrides.request_id ?? "req_1",
    receiptId: overrides.receipt_id ?? null,
    policyId: overrides.policy_id ?? APP.policy_id,
    policyVersion: 1,
  });
  if (overrides.created_at) row.created_at = overrides.created_at;
  return row;
}

function sandboxSummary(events: ReturnType<typeof buildIntegrationEventRow>[] = [], activity: Parameters<typeof buildPartnerPilotSummary>[0]["activity"] = []) {
  return buildPartnerPilotSummary({
    application: APP,
    events,
    activity,
    environment: "sandbox",
  });
}

describe("partner value evidence layer", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
    resetLaunchpadActivityForTests();
    resetValueEvidenceStoreForTests();
  });

  it("resolves technical lifecycle from integration events", () => {
    const events = [
      event({ event_type: "verification_request_created", request_id: "req_1" }),
      event({ event_type: "receipt_verification_succeeded", request_id: "req_1", receipt_id: "dr_1" }),
    ];
    const summary = sandboxSummary(events);
    const lifecycle = resolvePartnerLifecycle({
      application: APP,
      pilotSummarySandbox: summary,
      pilotSummaryProduction: null,
      activity: [],
      commercial: null,
    });
    expect(["integration_verified", "pilot_evidence_available"]).toContain(lifecycle.technical_stage);
    expect(lifecycle.commercial_stage).toBe("none");
  });

  it("requires operator assertion for commercial conversion and blocks without production", async () => {
    seedCommercialStateForTests({
      application_id: APP.id,
      partner_id: APP.partner_id,
      design_partner_status: "design_partner",
      commercial_lifecycle_stage: "converted",
      commercial_model_candidate: null,
      commercial_model_status: null,
      commercial_converted: true,
      commercial_declined: false,
      commercial_paused: false,
      effective_from: null,
      operator_actor: "operator",
      operator_note_reference: null,
      updated_at: "2026-03-01T00:00:00.000Z",
    });
    const summary = sandboxSummary([event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1" })]);
    const lifecycle = resolvePartnerLifecycle({
      application: APP,
      pilotSummarySandbox: summary,
      pilotSummaryProduction: null,
      activity: [],
      commercial: await import("./store").then((m) => m.loadCommercialState(APP.id)),
    });
    expect(lifecycle.blockers).toContain("production_activation_not_observed");
    expect(validateCommercialStatePatch({
      patch: { commercial_converted: true },
      productionActivatedAt: null,
    }).ok).toBe(false);
  });

  it("allows commercial conversion only when production is activated", async () => {
    const activatedApp = { ...APP, production_activated_at: "2026-03-01T00:00:00.000Z" };
    const commercial = await upsertCommercialState({
      applicationId: APP.id,
      partnerId: APP.partner_id,
      patch: { commercial_converted: true, commercial_lifecycle_stage: "converted" },
      operatorActor: "operator",
      productionActivatedAt: activatedApp.production_activated_at,
    });
    expect(commercial.commercial_converted).toBe(true);
  });

  it("computes integration velocity with unavailable when timestamps missing", () => {
    const velocity = computeIntegrationVelocity({ application: APP, events: [], activity: [] });
    expect(velocity.application_created_to_first_successful_verification.quality).toBe("unavailable");
    expect(velocity.application_created_to_first_sandbox_request.quality).toBe("unavailable");
  });

  it("computes measured integration velocity from durable timestamps", () => {
    const events = [
      event({ event_type: "verification_request_created", created_at: "2026-01-10T00:00:00.000Z" }),
      event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_v", created_at: "2026-01-12T00:00:00.000Z" }),
    ];
    const velocity = computeIntegrationVelocity({ application: APP, events, activity: [] });
    expect(velocity.application_created_to_first_successful_verification.quality).toBe("measured");
    expect(velocity.application_created_to_first_successful_verification.duration_ms).toBe(
      new Date("2026-01-12T00:00:00.000Z").getTime() - new Date(APP.created_at).getTime(),
    );
  });

  it("builds conversion counts with correct denominators and sample-size warnings", () => {
    const resolutions = [
      resolvePartnerLifecycle({
        application: APP,
        pilotSummarySandbox: sandboxSummary([event({ event_type: "verification_request_created" })]),
        pilotSummaryProduction: null,
        activity: [],
        commercial: null,
      }),
      resolvePartnerLifecycle({
        application: APP_B,
        pilotSummarySandbox: sandboxSummary([]),
        pilotSummaryProduction: null,
        activity: [],
        commercial: null,
      }),
    ];
    const snapshot = buildConversionSnapshot({ resolutions, commercialStates: [] });
    expect(snapshot.counts.sandbox_started).toBe(1);
    expect(snapshot.technical_production_conversion.denominator).toBe(1);
    expect(snapshot.technical_production_conversion.sample_size_warning).toBe(true);
  });

  it("computes win rate only from resolved commercial outcomes", () => {
    seedCommercialStateForTests({
      application_id: APP.id,
      partner_id: APP.partner_id,
      design_partner_status: "design_partner",
      commercial_lifecycle_stage: "converted",
      commercial_model_candidate: null,
      commercial_model_status: null,
      commercial_converted: true,
      commercial_declined: false,
      commercial_paused: false,
      effective_from: null,
      operator_actor: "operator",
      operator_note_reference: null,
      updated_at: "2026-03-01T00:00:00.000Z",
    });
    seedCommercialStateForTests({
      application_id: APP_B.id,
      partner_id: APP_B.partner_id,
      design_partner_status: "not_converted",
      commercial_lifecycle_stage: "none",
      commercial_model_candidate: null,
      commercial_model_status: null,
      commercial_converted: false,
      commercial_declined: false,
      commercial_paused: false,
      effective_from: null,
      operator_actor: "operator",
      operator_note_reference: null,
      updated_at: "2026-03-02T00:00:00.000Z",
    });
    const winRate = computeWinRate([
      { commercial_converted: true, commercial_declined: false, design_partner_status: "design_partner" } as never,
      { commercial_converted: false, commercial_declined: false, design_partner_status: "not_converted" } as never,
    ]);
    expect(winRate.wins).toBe(1);
    expect(winRate.losses).toBe(1);
    expect(winRate.resolved).toBe(2);
    expect(winRate.rate).toBe(0.5);
    expect(winRate.sample_size_warning).toBe(true);
  });

  it("counts production policy expansion but not sandbox-only second policy", () => {
    const sandboxEvents = [
      event({ policy_id: "partner-a-age_21_retail-v1", environment: "sandbox" }),
      event({ policy_id: "partner-a-residency_us-v1", environment: "sandbox", request_id: "req_2" }),
    ];
    const productionEvents = [
      event({ policy_id: "partner-a-age_21_retail-v1", environment: "production", request_id: "req_p1" }),
    ];
    const sandboxExpansion = computePolicyExpansion(sandboxEvents, "sandbox");
    const productionExpansion = computePolicyExpansion([...sandboxEvents, ...productionEvents], "production");
    expect(sandboxExpansion.policy_expansion_observed).toBe(true);
    expect(productionExpansion.policy_expansion_observed).toBe(false);
    expect(productionExpansion.active_policy_count).toBe(1);
  });

  it("does not count repeated same policy as expansion", () => {
    const events = [
      event({ policy_id: "partner-a-age_21_retail-v1", request_id: "req_1" }),
      event({ policy_id: "partner-a-age_21_retail-v1", request_id: "req_2" }),
    ];
    const expansion = computePolicyExpansion(events, "sandbox");
    expect(expansion.policy_expansion_observed).toBe(false);
    expect(expansion.active_policy_count).toBe(1);
  });

  it("detects environment expansion from sandbox to production", () => {
    const sandbox = sandboxSummary([event({ event_type: "verification_request_created" })]);
    const production = buildPartnerPilotSummary({
      application: { ...APP, production_activated_at: "2026-03-01T00:00:00.000Z" },
      events: [event({ event_type: "verification_request_created", environment: "production", request_id: "req_p" })],
      activity: [],
      environment: "production",
    });
    const env = computeEnvironmentExpansion({
      sandboxSummary: sandbox,
      productionSummary: production,
      productionActivated: true,
    });
    expect(env.environment_expansion_observed).toBe(true);
  });

  it("detects repeat integration activity without labeling SaaS retention", () => {
    const events = [
      event({ event_type: "receipt_verification_succeeded", created_at: "2026-01-05T00:00:00.000Z", receipt_id: "dr_1" }),
      event({ event_type: "receipt_verification_succeeded", created_at: "2026-02-05T00:00:00.000Z", receipt_id: "dr_2", request_id: "req_2" }),
    ];
    const repeat = computeRepeatIntegrationActivity({ events, environment: "sandbox" });
    expect(repeat.repeat_integration_activity).toBe(true);
    expect(repeat.label).toBe("monthly_active_integration");
    expect(repeat.periods_with_verification).toBeGreaterThan(1);
  });

  it("does not fabricate retention without multi-period activity", () => {
    const repeat = computeRepeatIntegrationActivity({
      events: [event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1" })],
      environment: "sandbox",
    });
    expect(repeat.repeat_integration_activity).toBe(false);
  });

  it("keeps holder reuse unavailable — no fingerprinting", () => {
    const summary = sandboxSummary([
      event({ event_type: "holder_flow_completed", request_id: "req_a" }),
      event({ event_type: "holder_flow_completed", request_id: "req_b" }),
    ]);
    const model = buildAbraxasValueModel({
      pilotSandbox: summary,
      pilotProduction: null,
      lifecycle: resolvePartnerLifecycle({
        application: APP,
        pilotSummarySandbox: summary,
        pilotSummaryProduction: null,
        activity: [],
        commercial: null,
      }),
      velocity: computeIntegrationVelocity({ application: APP, events: [], activity: [] }),
      policyExpansionProduction: computePolicyExpansion([], "production"),
      unitEconomics: buildUnitEconomicsReadiness(summary, null),
      repeatActivity: computeRepeatIntegrationActivity({ events: [], environment: "sandbox" }),
    });
    expect(model.holder_reuse.status).toBe("unavailable");
    expect(summary.metrics.repeat_holder_usage.quality).toBe("unavailable");
  });

  it("returns unavailable revenue and cost boundaries", () => {
    const summary = sandboxSummary([]);
    const economics = buildUnitEconomicsReadiness(summary, null);
    expect(economics.revenue_per_verification).toBe("unavailable");
    expect(economics.direct_cost_per_verification).toBe("unavailable");
    expect(economics.gross_margin).toBe("unavailable");
    expect(REVENUE_BOUNDARY.arr).toBe("unavailable");
    expect(REVENUE_BOUNDARY.revenue).toBe("unavailable");
  });

  it("classifies reusable vs one-off product requests", () => {
    seedFeatureRequestForTests({
      id: "fr_1",
      partner_id: APP.partner_id,
      application_id: APP.id,
      title: "Core policy engine",
      classification: "core_platform",
      reusable_across_market: "yes",
      blocks_production: false,
      status: "open",
      requested_by_partner: "partner-a",
    });
    seedFeatureRequestForTests({
      id: "fr_2",
      partner_id: APP.partner_id,
      application_id: APP.id,
      title: "Custom logo",
      classification: "custom_one_off",
      reusable_across_market: "no",
      blocks_production: true,
      status: "open",
      requested_by_partner: "partner-a",
    });
    const discipline = summarizeProductDiscipline([
      { id: "fr_1", partner_id: APP.partner_id, application_id: APP.id, title: "Core", classification: "core_platform", reusable_across_market: "yes", blocks_production: false, status: "open", requested_by_partner: "partner-a" },
      { id: "fr_2", partner_id: APP.partner_id, application_id: APP.id, title: "Custom", classification: "custom_one_off", reusable_across_market: "no", blocks_production: true, status: "open", requested_by_partner: "partner-a" },
    ]);
    expect(discipline.reusable_count).toBe(1);
    expect(discipline.one_off_count).toBe(1);
    expect(discipline.one_off_blocking_production).toBe(1);
  });

  it("marks case-study customer quote as operator-required and ROI unavailable", () => {
    const summary = sandboxSummary([event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1" })]);
    const readiness = buildCaseStudyReadiness({
      pilotSandbox: summary,
      pilotProduction: null,
      velocity: computeIntegrationVelocity({ application: APP, events: [], activity: [] }),
      policyExpansion: computePolicyExpansion([], "production"),
      commercial: null,
    });
    expect(readiness.customer_quote).toBe("operator_required");
    expect(readiness.customer_roi).toBe("unavailable");
    expect(readiness.missing_evidence).toContain("customer_quote");
  });

  it("populates fundraising matrix with revenue unavailable", () => {
    const summary = sandboxSummary([]);
    const matrix = buildFundraisingEvidenceMatrix({
      valueDimensions: {},
      pilotSandbox: summary,
      policyExpansion: computePolicyExpansion([], "production"),
      conversionCounts: {
        design_partners: 0,
        sandbox_started: 0,
        sandbox_success: 0,
        pilot_live: 0,
        production_requested: 0,
        production_active: 0,
        commercially_converted: 0,
      },
      caseStudyReady: false,
    });
    const revenueRow = matrix.find((row) => row.category === "7. revenue/ACV");
    expect(revenueRow?.status).toBe("unavailable");
  });

  it("ties investor claims to numerators, denominators, and freshness fields", () => {
    const summary = sandboxSummary([
      event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1", created_at: "2026-01-15T00:00:00.000Z" }),
    ]);
    const velocity = computeIntegrationVelocity({
      application: APP,
      events: [event({ event_type: "receipt_verification_succeeded", receipt_id: "dr_1", created_at: "2026-01-15T00:00:00.000Z" })],
      activity: [],
    });
    const claims = buildInvestorClaimRegistry({
      pilotSandbox: summary,
      pilotProduction: null,
      velocity,
      conversionCounts: {
        design_partners: 1,
        sandbox_started: 0,
        sandbox_success: 0,
        pilot_live: 0,
        production_requested: 0,
        production_active: 0,
        commercially_converted: 0,
      },
      policyExpansionCount: 0,
      generatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    const timeClaim = claims.find((c) => c.claim_id === "median_time_to_first_sandbox_verification");
    expect(timeClaim?.generated_at).toBe("2026-03-01T00:00:00.000Z");
    expect(timeClaim?.status).toBe("supported");
    const conversionClaim = claims.find((c) => c.claim_id === "production_conversion_share");
    expect(conversionClaim?.status).toBe("not_supported");
    expect(conversionClaim?.numerator).toBe(0);
    expect(conversionClaim?.denominator).toBe(0);
  });

  it("rejects PII and secrets in value evidence payloads", () => {
    expect(valueEvidenceLeaks({ legal_name: "Jane Doe" }).length).toBeGreaterThan(0);
    expect(valueEvidenceLeaks({ api_key: "sk_live_secret" }).length).toBeGreaterThan(0);
    expect(valueEvidenceLeaks({ wallet_address: "0xabc" }).length).toBeGreaterThan(0);
  });

  it("enforces tenant isolation — partner summaries stay scoped", () => {
    const summaryA = sandboxSummary([]);
    const summaryB = buildPartnerPilotSummary({
      application: APP_B,
      events: [],
      activity: [],
      environment: "sandbox",
    });
    expect(summaryA.partner_id).toBe("partner-a");
    expect(summaryB.partner_id).toBe("partner-b");
    expect(JSON.stringify(summaryA)).not.toContain("partner-b");
  });

  it("handles paused and not_converted commercial terminal states", () => {
    seedCommercialStateForTests({
      application_id: APP.id,
      partner_id: APP.partner_id,
      design_partner_status: "paused",
      commercial_lifecycle_stage: "none",
      commercial_model_candidate: null,
      commercial_model_status: null,
      commercial_converted: false,
      commercial_declined: false,
      commercial_paused: true,
      effective_from: null,
      operator_actor: "operator",
      operator_note_reference: null,
      updated_at: "2026-03-01T00:00:00.000Z",
    });
    const lifecycle = resolvePartnerLifecycle({
      application: APP,
      pilotSummarySandbox: sandboxSummary([]),
      pilotSummaryProduction: null,
      activity: [],
      commercial: {
        application_id: APP.id,
        partner_id: APP.partner_id,
        design_partner_status: "paused",
        commercial_lifecycle_stage: "none",
        commercial_model_candidate: null,
        commercial_model_status: null,
        commercial_converted: false,
        commercial_declined: false,
        commercial_paused: true,
        effective_from: null,
        operator_actor: "operator",
        operator_note_reference: null,
        updated_at: "2026-03-01T00:00:00.000Z",
      },
    });
    expect(lifecycle.lifecycle_stage).toBe("paused");
  });

  it("separates production requested to approved velocity in sandbox vs production paths", () => {
    recordLaunchpadActivityForTests({
      partner_id: APP.partner_id,
      application_id: APP.id,
      event_type: "production_access_requested",
      public_code: null,
      metadata: {},
      created_at: "2026-02-01T00:00:00.000Z",
    });
    recordLaunchpadActivityForTests({
      partner_id: APP.partner_id,
      application_id: APP.id,
      event_type: "production_access_approved",
      public_code: null,
      metadata: {},
      created_at: "2026-02-05T00:00:00.000Z",
    });
    const activity = [{
      event_type: "production_access_requested",
      public_code: null,
      metadata: {},
      created_at: "2026-02-01T00:00:00.000Z",
    }, {
      event_type: "production_access_approved",
      public_code: null,
      metadata: {},
      created_at: "2026-02-05T00:00:00.000Z",
    }];
    const velocity = computeIntegrationVelocity({ application: APP, events: [], activity });
    expect(velocity.production_requested_to_production_approved.quality).toBe("measured");
    expect(velocity.production_requested_to_production_approved.duration_ms).toBe(
      new Date("2026-02-05T00:00:00.000Z").getTime() - new Date("2026-02-01T00:00:00.000Z").getTime(),
    );
  });
});
