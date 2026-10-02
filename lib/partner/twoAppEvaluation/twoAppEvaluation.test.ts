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
import { buildTwoAppEvaluationView } from "./buildEvaluation";
import { canClaimExternalReuseProof } from "./claimGate";
import { inferEvidenceClassification } from "./classification";
import { buildTwoAppEvaluationEvidenceExport } from "./buildEvaluation";
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
    discovery_completed_at: "2026-10-01T09:55:00.000Z",
    blocked_category: null,
    blocked_note: null,
    ...overrides,
  };
}

function appRow(id: string, name: string): LaunchpadApplicationRow {
  return {
    id,
    public_slug: id.slice(0, 8),
    partner_id: PARTNER,
    application_name: name,
    display_name: name,
    environment: "sandbox",
    policy_id: `${PARTNER}-sandbox_institutional_protocol_access-v1`,
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

describe("two-app evaluation lifecycle", () => {
  beforeEach(() => {
    resetTwoAppEvaluationStoreForTests();
    resetLaunchpadApplicationMemoryForTests();
    resetIntegrationEventsForTests();
    resetLaunchpadActivityForTests();
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
    expect(view.success_criteria.all_met).toBe(false);
    expect(view.commercial_success_event).toBe("NOT_YET_OBSERVED");
  });

  it("marks EXTERNAL_TWO_APP_REUSE_COMPLETED when all criteria observed", async () => {
    const record = baseRecord();
    seedTwoAppEvaluationForTests(record);
    const t = (offset: number) => new Date(Date.parse(record.started_at) + offset).toISOString();

    for (const [appId, offset] of [[APP_A, 1000], [APP_B, 5000]] as const) {
      await recordIntegrationEvent({
        partnerId: PARTNER,
        applicationId: appId,
        environment: "sandbox",
        eventType: "receipt_issued",
        lifecycleStage: "receipt",
        outcome: "issued",
        metadata: {},
      });
      await recordIntegrationEvent({
        partnerId: PARTNER,
        applicationId: appId,
        environment: "sandbox",
        eventType: "receipt_verification_succeeded",
        lifecycleStage: "verification",
        outcome: "succeeded",
        metadata: {},
      });
    }

    await recordIntegrationEvent({
      partnerId: PARTNER,
      applicationId: APP_B,
      environment: "sandbox",
      eventType: "evidence_reuse_accepted",
      lifecycleStage: "policy",
      outcome: "reuse",
    });

    recordLaunchpadActivityForTests({
      event_type: "proof_created",
      public_code: "passport_required",
      metadata: {},
      created_at: t(500),
      partner_id: PARTNER,
      application_id: APP_A,
    });
    recordLaunchpadActivityForTests({
      event_type: "proof_reused",
      public_code: "reused",
      metadata: {},
      created_at: t(4500),
      partner_id: PARTNER,
      application_id: APP_B,
    });

    const view = await buildTwoAppEvaluationView(record);
    expect(view.commercial_success_event).toBe("EXTERNAL_TWO_APP_REUSE_COMPLETED");
    expect(view.reuse_metrics.reuse_status).toBe("accepted");
    expect(view.app_a.server_verification_passed).toBe(true);
    expect(view.app_b.server_verification_passed).toBe(true);
  });

  it("reference activity cannot classify as external without override", () => {
    expect(inferEvidenceClassification({ partnerId: "reference-harness" })).toBe("REFERENCE_TEST");
    expect(inferEvidenceClassification({ partnerId: "external-acme-corp" })).toBe("EXTERNAL_SANDBOX");
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
    seedTwoAppEvaluationForTests(record);

    for (const appId of [APP_A, APP_B]) {
      await recordIntegrationEvent({
        partnerId: PARTNER,
        applicationId: appId,
        environment: "sandbox",
        eventType: "receipt_verification_succeeded",
        lifecycleStage: "verification",
      });
    }
    await recordIntegrationEvent({
      partnerId: PARTNER,
      applicationId: APP_B,
      environment: "sandbox",
      eventType: "evidence_reuse_accepted",
      lifecycleStage: "policy",
      outcome: "reuse",
    });

    const view = await buildTwoAppEvaluationView(record);
    const packet = await buildTwoAppEvaluationEvidenceExport(record);
    expect(packet.evidence_status).toBe("COMPLETE");
    expect(JSON.stringify(packet)).not.toMatch(/"legal_name"|"date_of_birth"|"api_key"|"webhook_secret"/i);
    const gate = canClaimExternalReuseProof({
      evidence_classification: packet.evidence_classification,
      success_criteria: view.success_criteria,
      reuse_observed: packet.reuse_observed,
      evidence_internally_consistent: true,
    });
    expect(gate.allowed).toBe(true);
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
});
