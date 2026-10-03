// FILE: lib/partner/twoAppEvaluation/evaluationAuthorization.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { createHmac } from "node:crypto";
import { TWO_APP_EVAL_OWNER_COOKIE } from "./evaluationSession";
import type { TwoAppEvaluationRecord } from "./contract";

const loadTwoAppEvaluationRecord = vi.fn();
const buildTwoAppEvaluationView = vi.fn();
const buildTwoAppEvaluationEvidenceExport = vi.fn();
const requireAdminRouteAccess = vi.fn();
const resolvePartnerConsoleSession = vi.fn();

vi.mock("@/lib/partner/twoAppEvaluation/store", () => ({
  loadTwoAppEvaluationRecord: (...args: unknown[]) => loadTwoAppEvaluationRecord(...args),
}));

vi.mock("@/lib/partner/twoAppEvaluation/buildEvaluation", () => ({
  buildTwoAppEvaluationView: (...args: unknown[]) => buildTwoAppEvaluationView(...args),
  buildTwoAppEvaluationEvidenceExport: (...args: unknown[]) => buildTwoAppEvaluationEvidenceExport(...args),
}));

vi.mock("@/lib/admin/requireAdminRouteAccess", () => ({
  requireAdminRouteAccess: (...args: unknown[]) => requireAdminRouteAccess(...args),
}));

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolvePartnerConsoleSession(...args),
}));

vi.mock("@/lib/partner/launchpad/rateLimit", () => ({
  checkLaunchpadRateLimit: async () => ({ allowed: true }),
}));

import { GET } from "@/app/api/evaluation/two-app/[evaluationId]/route";

const EVAL_ID = "eval-auth-001";
const PARTNER_A = "partner-a";
const PARTNER_B = "partner-b";

function baseRecord(partnerId = PARTNER_A): TwoAppEvaluationRecord {
  return {
    evaluation_id: EVAL_ID,
    partner_id: partnerId,
    environment: "sandbox",
    started_at: "2026-10-01T10:00:00.000Z",
    target_policy_pack: "identity_liveness",
    app_a: { application_id: "app-a", display_name: "App A" },
    app_b: { application_id: "app-b", display_name: "App B" },
    evidence_classification: "UNCLASSIFIED_SANDBOX",
    operator_classification_override: null,
    classification_source: "unclassified",
    classified_at: null,
    classification_operator_ref: null,
    discovery_completed_at: null,
    blocked_category: null,
    blocked_note: null,
  };
}

function mockView(record: TwoAppEvaluationRecord) {
  return {
    record,
    stage: "sandbox_ready",
    stage_source: "test",
    app_a: { application_id: "app-a", display_name: "App A", items: [], server_verification_passed: false, result_verified_at: null },
    app_b: { application_id: "app-b", display_name: "App B", items: [], server_verification_passed: false, result_verified_at: null },
    reuse: { status: "not_yet_observed", observed_at: null, source: null, safe_reason: null },
    reuse_metrics: {
      underlying_verification_events: null,
      applications_with_verified_results: 0,
      additional_raw_kyc_recollections: null,
      reuse_status: "not_yet_observed",
      server_verification_app_a: false,
      server_verification_app_b: false,
      metrics_quality: "not_yet_observed",
    },
    time_to_value: { notice: "test", evaluation_start_to_sandbox_ready_ms: null, evaluation_start_to_first_verified_result_ms: null, app_a_success_to_app_b_configured_ms: null, app_a_success_to_reuse_success_ms: null, evaluation_start_to_reuse_success_ms: null },
    payload_comparison: { source_evidence_may_include: [], application_receives: [], observed_field_inventory: [], quality: "conceptual" },
    success_criteria: {
      external_partner_context: false,
      technical_success_met: false,
      two_distinct_applications: true,
      app_a_server_verified: false,
      app_b_server_verified: false,
      reuse_accepted_observed: false,
      no_second_provider_verification_for_reuse: null,
      public_partner_interfaces_used: true,
      privacy_checks_pass: true,
      evidence_exportable: false,
      all_met: false,
    },
    partner_summary: null,
    blockers: [],
    evidence_packet_ready: false,
    technical_evaluation_status: "NOT_YET_OBSERVED",
    external_proof_eligibility: "NOT_ESTABLISHED",
    commercial_success_event: "NOT_YET_OBSERVED",
  };
}

async function ownerCookie(partnerId: string): Promise<string> {
  vi.stubEnv("ABRAXAS_BROWSER_SESSION_SECRET", "test-browser-session-secret-32chars");
  const secret = new Uint8Array(
    createHmac("sha256", "test-browser-session-secret-32chars")
      .update("abraxas:two-app-eval-owner:v1")
      .digest(),
  );
  return new SignJWT({
    evaluation_id: EVAL_ID,
    partner_id: partnerId,
    typ: "two_app_eval_owner",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(EVAL_ID)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

describe("two-app evaluation read/export authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminRouteAccess.mockResolvedValue({ status: 401, json: async () => ({ error: "Unauthorized" }) });
    resolvePartnerConsoleSession.mockResolvedValue(null);
    loadTwoAppEvaluationRecord.mockResolvedValue(baseRecord());
    buildTwoAppEvaluationView.mockImplementation(async (record: TwoAppEvaluationRecord) => mockView(record));
    buildTwoAppEvaluationEvidenceExport.mockResolvedValue({ contract_version: "1.0.0" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies anonymous UUID possession", async () => {
    const req = new NextRequest(`http://localhost/api/evaluation/two-app/${EVAL_ID}`);
    const res = await GET(req, { params: { evaluationId: EVAL_ID } });
    expect(res.status).toBe(403);
  });

  it("allows owner cookie session", async () => {
    const token = await ownerCookie(PARTNER_A);
    const req = new NextRequest(`http://localhost/api/evaluation/two-app/${EVAL_ID}`, {
      headers: { cookie: `${TWO_APP_EVAL_OWNER_COOKIE}=${token}` },
    });
    const res = await GET(req, { params: { evaluationId: EVAL_ID } });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  it("denies cross-partner owner cookie", async () => {
    const token = await ownerCookie(PARTNER_B);
    const req = new NextRequest(`http://localhost/api/evaluation/two-app/${EVAL_ID}`, {
      headers: { cookie: `${TWO_APP_EVAL_OWNER_COOKIE}=${token}` },
    });
    const res = await GET(req, { params: { evaluationId: EVAL_ID } });
    expect(res.status).toBe(403);
  });

  it("allows launchpad console session for owning partner", async () => {
    resolvePartnerConsoleSession.mockResolvedValue({ partnerId: PARTNER_A, apiKeyId: "key-1", environment: "sandbox" });
    const req = new NextRequest(`http://localhost/api/evaluation/two-app/${EVAL_ID}`);
    const res = await GET(req, { params: { evaluationId: EVAL_ID } });
    expect(res.status).toBe(200);
  });

  it("denies export for cross-partner session", async () => {
    resolvePartnerConsoleSession.mockResolvedValue({ partnerId: PARTNER_B, apiKeyId: "key-2", environment: "sandbox" });
    const req = new NextRequest(`http://localhost/api/evaluation/two-app/${EVAL_ID}?export=evidence`);
    const res = await GET(req, { params: { evaluationId: EVAL_ID } });
    expect(res.status).toBe(403);
  });

  it("allows admin access without owner cookie", async () => {
    requireAdminRouteAccess.mockResolvedValue(null);
    const req = new NextRequest(`http://localhost/api/evaluation/two-app/${EVAL_ID}`);
    const res = await GET(req, { params: { evaluationId: EVAL_ID } });
    expect(res.status).toBe(200);
  });
});
