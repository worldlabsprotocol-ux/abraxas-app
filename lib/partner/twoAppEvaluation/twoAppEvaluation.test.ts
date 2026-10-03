// FILE: lib/partner/twoAppEvaluation/twoAppEvaluation.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import {
  resetTwoAppEvaluationStoreForTests,
  seedTwoAppEvaluationForTests,
} from "./store";
import {
  resetLaunchpadApplicationMemoryForTests,
  seedLaunchpadApplicationForTests,
} from "./observe";
import {
  resetIntegrationEventsForTests,
  recordIntegrationEvent,
} from "@/lib/partner/integrationObservability/record";
import { recordLaunchpadActivityForTests, resetLaunchpadActivityForTests } from "@/lib/partner/pilotEvidence/load";
import type { TwoAppEvaluationRecord } from "./contract";
import { TWO_APP_DEFAULT_POLICY_PACK } from "./contract";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { buildTwoAppEvaluationView } from "./buildEvaluation";
import { canClaimExternalReuseProof } from "./claimGate";
import {
  inferEvidenceClassification,
  resetPromotedDesignPartnerMemoryForTests,
  seedPromotedDesignPartnerForTests,
} from "./classification";
import { buildTwoAppEvaluationEvidenceExport } from "./buildEvaluation";
import { classifyTwoAppEvaluationByOperator } from "./classifyOperator";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

const PARTNER = "external-fintech-co";
const APP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const APP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function baseRecord(overrides: Partial<TwoAppEvaluationRecord> = {}): TwoAppEvaluationRecord {
  return {
    evaluation_id: "eval-test-001",
    partner_id: PARTNER,
    environment: "sandbox",
    started_at: "2026-10-01T10:00:00.000Z",
    target_policy_pack: "sandbox_institutional_protocol_access",
    app_a: { application_id: APP_A, display_name: "App A" },
    app_b: { application_id: APP_B, display_name: "App B" },
    evidence_classification: "EXTERNAL_SANDBOX",
    operator_classification_override: null,
    classification_source: "operator_review",
    classified_at: "2026-10-01T09:50:00.000Z",
    classification_operator_ref: "admin_authorized_email",
    discovery_completed_at: "2026-10-01T09:55:00.000Z",
    blocked_category: null,
    blocked_note: null,
    ...overrides,
  };
}

function appRow(id: string, name: string, partnerId = PARTNER): LaunchpadApplicationRow {
  return {
    id,
    public_slug: id.slice(0, 8),
    partner_id: partnerId,
    application_name: name,
    display_name: name,
    environment: "sandbox",
    policy_id: `${partnerId}-sandbox_institutional_protocol_access-v1`,
    policy_version: 1,
    policy_template_id: "sandbox_institutional_protocol_access",
    allowed_return_urls: ["http://localhost:3000/callback"],
    api_key_id: "key-1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-10-01T10:00:00.000Z",
    updated_at: "2026-10-01T10:00:00.000Z",
  };
}

async function seedFullTechnicalSuccess(record: TwoAppEvaluationRecord): Promise<void> {
  seedTwoAppEvaluationForTests(record);
  for (const appId of [APP_A, APP_B]) {
    await recordIntegrationEvent({
      partnerId: record.partner_id,
      applicationId: appId,
      environment: "sandbox",
      eventType: "receipt_verification_succeeded",
      lifecycleStage: "verification",
    });
  }
  await recordIntegrationEvent({
    partnerId: record.partner_id,
    applicationId: APP_B,
    environment: "sandbox",
    eventType: "evidence_reuse_accepted",
    lifecycleStage: "policy",
    outcome: "reuse",
  });
}

describe("two-app evaluation lifecycle", () => {
  it("default policy pack enables reuse on the canonical sandbox path", () => {
    expect(TWO_APP_DEFAULT_POLICY_PACK).toBe("identity_liveness");
    const pack = POLICY_PACKS[TWO_APP_DEFAULT_POLICY_PACK];
    expect(pack.reuse_evidence_freshness?.allow_reuse).toBe(true);
    expect(POLICY_PACKS.sandbox_institutional_protocol_access.reuse_evidence_freshness?.allow_reuse).toBe(false);
  });

  beforeEach(() => {
    resetTwoAppEvaluationStoreForTests();
    resetLaunchpadApplicationMemoryForTests();
    resetIntegrationEventsForTests();
    resetLaunchpadActivityForTests();
    resetPromotedDesignPartnerMemoryForTests();
    seedLaunchpadApplicationForTests(appRow(APP_A, "App A"));
    seedLaunchpadApplicationForTests(appRow(APP_B, "App B"));
  });

  it("requires two distinct applications", async () => {
    const record = baseRecord({
      app_b: { application_id: APP_A, display_name: "Same" },
    });
    seedTwoAppEvaluationForTests(record);
    const view = await buildTwoAppEvaluationView(record);
    expect(view.success_criteria.two_distinct_applications).toBe(false);
  });

  it("does not mark reuse from configuration alone", async () => {
    const record = baseRecord();
    seedTwoAppEvaluationForTests(record);
    recordLaunchpadActivityForTests({
      event_type: "application_provisioned",
      public_code: "provisioned",
      metadata: {},
      created_at: record.started_at,
      partner_id: PARTNER,
      application_id: APP_A,
    });
    const view = await buildTwoAppEvaluationView(record);
    expect(view.reuse.status).toBe("not_yet_observed");
    expect(view.commercial_success_event).toBe("NOT_YET_OBSERVED");
    expect(view.stage).not.toBe("reuse_confirmed");
  });

  it("requires App A verification before App B reuse success", async () => {
    const record = baseRecord();
    seedTwoAppEvaluationForTests(record);

    await recordIntegrationEvent({
      partnerId: PARTNER,
      applicationId: APP_B,
      environment: "sandbox",
      eventType: "evidence_reuse_accepted",
      lifecycleStage: "policy",
      outcome: "reuse",
    });

    const view = await buildTwoAppEvaluationView(record);
    expect(view.reuse.status).toBe("accepted");
    expect(view.success_criteria.technical_success_met).toBe(false);
    expect(view.commercial_success_event).toBe("NOT_YET_OBSERVED");
  });

  it("marks EXTERNAL_TWO_APP_REUSE_COMPLETED only with external classification + technical success", async () => {
    const record = baseRecord();
    await seedFullTechnicalSuccess(record);
    const view = await buildTwoAppEvaluationView(record);
    expect(view.commercial_success_event).toBe("EXTERNAL_TWO_APP_REUSE_COMPLETED");
    expect(view.technical_evaluation_status).toBe("COMPLETE");
    expect(view.external_proof_eligibility).toBe("ESTABLISHED");
    expect(view.reuse_metrics.reuse_status).toBe("accepted");
  });

  it("technical success without external classification cannot emit commercial success event", async () => {
    const record = baseRecord({
      partner_id: "random-fabricated-partner",
      evidence_classification: "UNCLASSIFIED_SANDBOX",
      classification_source: "unclassified",
      classified_at: null,
      classification_operator_ref: null,
    });
    await seedFullTechnicalSuccess(record);
    const view = await buildTwoAppEvaluationView(record);
    expect(view.success_criteria.technical_success_met).toBe(true);
    expect(view.commercial_success_event).toBe("NOT_YET_OBSERVED");
    expect(view.external_proof_eligibility).toBe("NOT_ESTABLISHED");
  });

  it("reference activity cannot classify as external without override", () => {
    expect(inferEvidenceClassification({ partnerId: "reference-harness" })).toBe("REFERENCE_TEST");
    expect(inferEvidenceClassification({ partnerId: "external-acme-corp" })).toBe("UNCLASSIFIED_SANDBOX");
  });

  it("random partner ID is not external", () => {
    expect(inferEvidenceClassification({ partnerId: "totally-random-partner-xyz" })).toBe("UNCLASSIFIED_SANDBOX");
  });

  it("UUID partner ID is not external", () => {
    expect(inferEvidenceClassification({ partnerId: "550e8400-e29b-41d4-a716-446655440000" })).toBe("UNCLASSIFIED_SANDBOX");
  });

  it("studio anonymous partner ID is internal not external", () => {
    expect(inferEvidenceClassification({ partnerId: "studio-eval-abc123" })).toBe("INTERNAL_SANDBOX");
  });

  it("external classification alone cannot mark success", async () => {
    const record = baseRecord({ evidence_classification: "EXTERNAL_SANDBOX" });
    seedTwoAppEvaluationForTests(record);
    const view = await buildTwoAppEvaluationView(record);
    const gate = canClaimExternalReuseProof({
      evidence_classification: view.record.evidence_classification,
      success_criteria: view.success_criteria,
      reuse_observed: false,
      evidence_internally_consistent: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("reuse_accepted_event_required");
  });

  it("claim gate passes only with observed external reuse", async () => {
    const record = baseRecord();
    await seedFullTechnicalSuccess(record);

    const view = await buildTwoAppEvaluationView(record);
    const packet = await buildTwoAppEvaluationEvidenceExport(record);
    expect(packet.technical_evaluation_status).toBe("COMPLETE");
    expect(packet.external_proof_eligibility).toBe("ESTABLISHED");
    expect(JSON.stringify(packet)).not.toMatch(/"legal_name"|"date_of_birth"|"api_key"|"webhook_secret"/i);
    const gate = canClaimExternalReuseProof({
      evidence_classification: packet.evidence_classification,
      success_criteria: view.success_criteria,
      reuse_observed: packet.reuse_observed,
      evidence_internally_consistent: true,
    });
    expect(gate.allowed).toBe(true);
  });

  it("UNCLASSIFIED cannot claim external", () => {
    const gate = canClaimExternalReuseProof({
      evidence_classification: "UNCLASSIFIED_SANDBOX",
      success_criteria: {
        external_partner_context: false,
        technical_success_met: true,
        two_distinct_applications: true,
        app_a_server_verified: true,
        app_b_server_verified: true,
        reuse_accepted_observed: true,
        no_second_provider_verification_for_reuse: true,
        public_partner_interfaces_used: true,
        privacy_checks_pass: true,
        evidence_exportable: true,
        all_met: true,
      },
      reuse_observed: true,
      evidence_internally_consistent: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("classification_unclassified");
  });

  it("INTERNAL_SANDBOX cannot claim external", () => {
    const gate = canClaimExternalReuseProof({
      evidence_classification: "INTERNAL_SANDBOX",
      success_criteria: {
        external_partner_context: false,
        technical_success_met: true,
        two_distinct_applications: true,
        app_a_server_verified: true,
        app_b_server_verified: true,
        reuse_accepted_observed: true,
        no_second_provider_verification_for_reuse: true,
        public_partner_interfaces_used: true,
        privacy_checks_pass: true,
        evidence_exportable: true,
        all_met: true,
      },
      reuse_observed: true,
      evidence_internally_consistent: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("classification_not_external");
  });

  it("REFERENCE_TEST cannot claim external", () => {
    const gate = canClaimExternalReuseProof({
      evidence_classification: "REFERENCE_TEST",
      success_criteria: {
        external_partner_context: false,
        technical_success_met: true,
        two_distinct_applications: true,
        app_a_server_verified: true,
        app_b_server_verified: true,
        reuse_accepted_observed: true,
        no_second_provider_verification_for_reuse: true,
        public_partner_interfaces_used: true,
        privacy_checks_pass: true,
        evidence_exportable: true,
        all_met: true,
      },
      reuse_observed: true,
      evidence_internally_consistent: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons).toContain("classification_not_external");
  });

  it("missing classification defaults to unclassified not external", async () => {
    const record = baseRecord({
      evidence_classification: "UNCLASSIFIED_SANDBOX",
      classification_source: "unclassified",
      classified_at: null,
      classification_operator_ref: null,
    });
    seedTwoAppEvaluationForTests(record);
    const view = await buildTwoAppEvaluationView(record);
    expect(view.record.evidence_classification).toBe("UNCLASSIFIED_SANDBOX");
    expect(view.external_proof_eligibility).toBe("NOT_ESTABLISHED");
  });

  it("operator classification establishes external proof when technical success is met", async () => {
    const record = baseRecord({
      evidence_classification: "UNCLASSIFIED_SANDBOX",
      classification_source: "unclassified",
      classified_at: null,
      classification_operator_ref: null,
    });
    await seedFullTechnicalSuccess(record);

    const classified = await classifyTwoAppEvaluationByOperator({
      evaluationId: record.evaluation_id,
      classification: "EXTERNAL_SANDBOX",
      operatorActor: "admin_authorized_email",
    });
    expect(classified.ok).toBe(true);

    const view = await buildTwoAppEvaluationView(classified.record!);
    expect(view.commercial_success_event).toBe("EXTERNAL_TWO_APP_REUSE_COMPLETED");
    expect(view.record.classification_source).toBe("operator_review");
    expect(view.record.classified_at).toBeTruthy();
  });

  it("promoted design partner resolves to external sandbox", async () => {
    seedPromotedDesignPartnerForTests("promoted-acme-v1");
    const { resolveEvidenceClassification } = await import("./classification");
    const resolved = await resolveEvidenceClassification({ partnerId: "promoted-acme-v1" });
    expect(resolved.classification).toBe("EXTERNAL_SANDBOX");
    expect(resolved.source).toBe("design_partner_promotion");
  });

  it("evidence packet distinguishes technical success from external proof eligibility", async () => {
    const record = baseRecord({
      evidence_classification: "UNCLASSIFIED_SANDBOX",
      classification_source: "unclassified",
    });
    await seedFullTechnicalSuccess(record);
    const packet = await buildTwoAppEvaluationEvidenceExport(record);
    expect(packet.technical_evaluation_status).toBe("COMPLETE");
    expect(packet.external_proof_eligibility).toBe("NOT_ESTABLISHED");
    expect(packet.limitations.some((l) => l.includes("NOT ESTABLISHED"))).toBe(true);
  });

  it("partner summary never auto-publishes customer name", async () => {
    const record = baseRecord();
    await seedFullTechnicalSuccess(record);
    const view = await buildTwoAppEvaluationView(record);
    const serialized = JSON.stringify(view.partner_summary);
    expect(serialized).not.toMatch(/Acme|Corp|Inc|customer name|legal_name/i);
  });

  it("reports reuse rejection with safe reason", async () => {
    const record = baseRecord();
    seedTwoAppEvaluationForTests(record);
    await recordIntegrationEvent({
      partnerId: PARTNER,
      applicationId: APP_B,
      environment: "sandbox",
      eventType: "evidence_reuse_rejected",
      lifecycleStage: "policy",
      partnerSafeReason: "policy_mismatch",
      outcome: "denied",
    });
    const view = await buildTwoAppEvaluationView(record);
    expect(view.reuse.status).toBe("rejected");
    expect(view.blockers).toContain("reuse_not_compatible");
  });

  it("derives stage precedence deterministically", async () => {
    const record = baseRecord();
    seedTwoAppEvaluationForTests(record);
    let view = await buildTwoAppEvaluationView(record);
    expect(["sandbox_ready", "app_a_configured"]).toContain(view.stage);

    await recordIntegrationEvent({
      partnerId: PARTNER,
      applicationId: APP_A,
      environment: "sandbox",
      eventType: "receipt_verification_succeeded",
      lifecycleStage: "verification",
    });
    view = await buildTwoAppEvaluationView(record);
    expect(view.stage).toBe("app_a_result_verified");
  });

  it("classification does not alter technical success events", async () => {
    const unclassified = baseRecord({
      evidence_classification: "UNCLASSIFIED_SANDBOX",
      classification_source: "unclassified",
    });
    const external = baseRecord();
    await seedFullTechnicalSuccess(unclassified);
    await seedFullTechnicalSuccess({ ...external, evaluation_id: "eval-test-002" });

    const unclassifiedView = await buildTwoAppEvaluationView(unclassified);
    const externalView = await buildTwoAppEvaluationView(external);
    expect(unclassifiedView.success_criteria.technical_success_met).toBe(true);
    expect(externalView.success_criteria.technical_success_met).toBe(true);
    expect(unclassifiedView.commercial_success_event).toBe("NOT_YET_OBSERVED");
    expect(externalView.commercial_success_event).toBe("EXTERNAL_TWO_APP_REUSE_COMPLETED");
  });
});
