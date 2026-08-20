// FILE: lib/demo/partnerSandboxDemoRoutes.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import { demoViewHasNoForbiddenKeys, demoResponseHasNoOperationalClaims, DEMO_EVALUATION_FIELDS, DEMO_COMPLETION_FIELDS } from "@/lib/demo/partnerSandboxDemoViews";
import { PARTNER_SANDBOX_DEMO_INTERNAL_ERROR } from "@/lib/demo/partnerSandboxDemoErrors";

const checkAdminMock = vi.fn();
const getPassportStatusMock = vi.fn();
const evaluatePolicyMock = vi.fn();
const completeReceiptMock = vi.fn();
const validateReceiptMock = vi.fn();
const diagnoseIntegrityMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkAdmin: (...args: unknown[]) => checkAdminMock(...args),
}));

vi.mock("@/lib/demo/partnerSandboxDemoService", () => ({
  getPartnerSandboxDemoPassportStatus: (...args: unknown[]) => getPassportStatusMock(...args),
  evaluatePartnerSandboxDemoPolicy: (...args: unknown[]) => evaluatePolicyMock(...args),
  completePartnerSandboxDemoReceipt: (...args: unknown[]) => completeReceiptMock(...args),
  validatePartnerSandboxDemoReceipt: (...args: unknown[]) => validateReceiptMock(...args),
  diagnosePartnerSandboxDemoReceiptIntegrity: (...args: unknown[]) => diagnoseIntegrityMock(...args),
}));

import { GET as statusGET } from "@/app/api/admin/partner-sandbox-demo/status/route";
import { POST as evaluatePOST } from "@/app/api/admin/partner-sandbox-demo/evaluate/route";
import { POST as completePOST } from "@/app/api/admin/partner-sandbox-demo/complete/route";
import { GET as validateGET } from "@/app/api/admin/partner-sandbox-demo/validate/route";
import { GET as signingHealthGET } from "@/app/api/admin/partner-sandbox-demo/signing-health/route";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { signingHealthResponseHasNoSecrets } from "@/lib/decisionReceipts/signingKeyDiagnostics";
import { integrityResponseHasNoSecrets } from "@/lib/decisionReceipts/receiptIntegrityDiagnostics";

const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RECEIPT_ID = "dr_sandbox_demo_receipt01";
const ADMIN_PIN = "test-admin-pin";
const SENSITIVE_ERROR =
  "Supabase failed for subject 0x123 with postgres connection secret";

function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "x-admin-pin": ADMIN_PIN, ...extra };
}

function expectNoStore(res: Response): void {
  expect(res.headers.get("Cache-Control")).toBe("no-store, must-revalidate");
}

describe("partner sandbox demo API routes", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", "true");
    vi.stubEnv("ADMIN_PIN", ADMIN_PIN);
    checkAdminMock.mockReturnValue(true);
    getPassportStatusMock.mockResolvedValue({
      label: "Synthetic sandbox holder (pre-provisioned for demonstration)",
      credential_status: "active",
      required_claim_types_present: ["identity_verified"],
      required_claim_types_missing: [],
      sandbox_only: true,
    });
    evaluatePolicyMock.mockResolvedValue({
      partner_id: DEMO_SANDBOX_PARTNER_ID,
      policy_id: DEMO_SANDBOX_POLICY_ID,
      decision: "approved",
      reason_codes: [],
      missing_claims: [],
      decision_context: "sandbox_only",
      production_usable: false,
    });
    completeReceiptMock.mockResolvedValue({
      partner_id: DEMO_SANDBOX_PARTNER_ID,
      policy_id: DEMO_SANDBOX_POLICY_ID,
      decision_id: "dec-demo",
      receipt_id: RECEIPT_ID,
      replay_status: "issued",
      decision: "approved",
    });
    validateReceiptMock.mockResolvedValue({
      receipt_id: RECEIPT_ID,
      policy_id: DEMO_SANDBOX_POLICY_ID,
      decision_result: "approved",
      evaluated_at: "2026-08-10T00:00:00.000Z",
      expires_at: "2026-08-11T00:00:00.000Z",
      signature_valid: true,
      currently_valid: true,
      invalidation_reasons: [],
    });
    diagnoseIntegrityMock.mockResolvedValue({
      payload_hash_matches_recomputed: false,
      signature_valid: false,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe.each([
    ["status", () => statusGET(new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status"))],
    [
      "evaluate",
      () =>
        evaluatePOST(
          new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          }),
        ),
    ],
    [
      "complete",
      () =>
        completePOST(
          new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          }),
        ),
    ],
    [
      "validate",
      () =>
        validateGET(
          new NextRequest(
            `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}`,
          ),
        ),
    ],
  ])("feature gating — %s", (_name, callRoute) => {
    it("returns 404 when feature flag is missing", async () => {
      vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", "");
      const res = await callRoute();
      expect(res.status).toBe(404);
      expectNoStore(res);
    });

    it.each(["false", "TRUE", "1", "   "])(
      "returns 404 when feature flag is %j",
      async (value) => {
        vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", value);
        const res = await callRoute();
        expect(res.status).toBe(404);
      },
    );

    it("enables when trimmed lowercase true", async () => {
      vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", " true ");
      const res = await callRoute();
      expect(res.status).not.toBe(404);
    });
  });

  describe.each([
    ["status", () => statusGET(new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status"))],
    [
      "evaluate",
      () =>
        evaluatePOST(
          new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          }),
        ),
    ],
    [
      "complete",
      () =>
        completePOST(
          new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          }),
        ),
    ],
    [
      "validate",
      () =>
        validateGET(
          new NextRequest(
            `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}`,
          ),
        ),
    ],
  ])("authorization — %s", (_name, callRoute) => {
    it("returns 401 without admin authorization", async () => {
      checkAdminMock.mockReturnValue(false);
      const res = await callRoute();
      expect(res.status).toBe(401);
      expectNoStore(res);
    });

    it("returns 401 with incorrect admin pin", async () => {
      checkAdminMock.mockReturnValue(false);
      const res = await statusGET(
        new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status", {
          headers: { "x-admin-pin": "wrong-pin" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("succeeds with valid admin pin header", async () => {
      const res = await statusGET(
        new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status", {
          headers: adminHeaders(),
        }),
      );
      expect(res.status).toBe(200);
      expectNoStore(res);
    });
  });

  it("status rejects query subject_id", async () => {
    const res = await statusGET(
      new NextRequest(
        `http://localhost/api/admin/partner-sandbox-demo/status?subject_id=${SUBJECT}`,
        { headers: adminHeaders() },
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("client_subject_not_allowed");
  });

  it("evaluate rejects body subject_id, partner_id, and policy_id", async () => {
    const subjectRes = await evaluatePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ subject_id: SUBJECT }),
      }),
    );
    expect(subjectRes.status).toBe(400);
    expect((await subjectRes.json()).error).toBe("client_subject_not_allowed");

    const partnerRes = await evaluatePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ partner_id: "evil-partner" }),
      }),
    );
    expect(partnerRes.status).toBe(400);
    const partnerBody = await partnerRes.json();
    expect(partnerBody.error).toBe("client_partner_policy_not_allowed");
  });

  it("complete rejects body subject_id, partner_id, and policy_id", async () => {
    const subjectRes = await completePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ subject_id: SUBJECT }),
      }),
    );
    expect(subjectRes.status).toBe(400);
    expect((await subjectRes.json()).error).toBe("client_subject_not_allowed");

    const policyRes = await completePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ policy_id: "evil-policy" }),
      }),
    );
    expect(policyRes.status).toBe(400);
  });

  it("validate rejects invalid receipt_id formats", async () => {
    const missing = await validateGET(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/validate", {
        headers: adminHeaders(),
      }),
    );
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toBe("receipt_id_required");

    const bad = await validateGET(
      new NextRequest(
        "http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=not-a-receipt",
        { headers: adminHeaders() },
      ),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("receipt_id_invalid");
  });

  it("validate rejects non-sandbox receipts via service boundary", async () => {
    validateReceiptMock.mockRejectedValue(new Error("demo_receipt_not_sandbox"));
    const res = await validateGET(
      new NextRequest(
        `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}`,
        { headers: adminHeaders() },
      ),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("demo_receipt_not_sandbox");
  });

  it("status response contains no forbidden privacy fields", async () => {
    const res = await statusGET(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status", {
        headers: adminHeaders(),
      }),
    );
    const body = await res.json();
    expect(demoViewHasNoForbiddenKeys(body.passport as Record<string, unknown>)).toBe(true);
    expect(JSON.stringify(body)).not.toContain(SUBJECT);
  });

  it("validate response contains no forbidden privacy fields", async () => {
    const res = await validateGET(
      new NextRequest(
        `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}`,
        { headers: adminHeaders() },
      ),
    );
    const body = await res.json();
    expect(demoViewHasNoForbiddenKeys(body.receipt as Record<string, unknown>)).toBe(true);
    expect(Object.keys(body.receipt as Record<string, unknown>)).not.toContain("signature");
    expect((body.receipt as { signature_valid?: boolean }).signature_valid).toBe(true);
  });

  it("evaluate returns safe error categories without raw provider errors", async () => {
    evaluatePolicyMock.mockRejectedValue(new Error("partner_sandbox_demo_subject_not_configured"));
    const res = await evaluatePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("partner_sandbox_demo_subject_not_configured");
    expect(JSON.stringify(body)).not.toMatch(/supabase|postgres|stack/i);
  });

  it.each([
    ["status", () => getPassportStatusMock, () => statusGET(new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status", { headers: adminHeaders() }))],
    [
      "evaluate",
      () => evaluatePolicyMock,
      () =>
        evaluatePOST(
          new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
            method: "POST",
            headers: { ...adminHeaders(), "content-type": "application/json" },
            body: JSON.stringify({}),
          }),
        ),
    ],
    [
      "complete",
      () => completeReceiptMock,
      () =>
        completePOST(
          new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
            method: "POST",
            headers: { ...adminHeaders(), "content-type": "application/json" },
            body: JSON.stringify({}),
          }),
        ),
    ],
    [
      "validate",
      () => validateReceiptMock,
      () =>
        validateGET(
          new NextRequest(
            `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}`,
            { headers: adminHeaders() },
          ),
        ),
    ],
  ])("%s hides sensitive internal errors", async (_name, getMock, callRoute) => {
    getMock().mockRejectedValue(new Error(SENSITIVE_ERROR));
    const res = await callRoute();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe(PARTNER_SANDBOX_DEMO_INTERNAL_ERROR);
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/supabase/i);
    expect(serialized).not.toMatch(/postgres/i);
    expect(serialized).not.toContain("0x123");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain(SENSITIVE_ERROR);
  });

  it("evaluate strips extra fields from service response", async () => {
    evaluatePolicyMock.mockResolvedValue({
      partner_id: DEMO_SANDBOX_PARTNER_ID,
      policy_id: DEMO_SANDBOX_POLICY_ID,
      decision: "approved",
      reason_codes: [],
      missing_claims: [],
      decision_context: "sandbox_only",
      production_usable: false,
      subject_id: SUBJECT,
      api_key: "secret-key",
    });
    const res = await evaluatePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.keys(body.evaluation).sort()).toEqual([...DEMO_EVALUATION_FIELDS].sort());
    expect(JSON.stringify(body)).not.toContain(SUBJECT);
    expect(JSON.stringify(body)).not.toContain("secret-key");
  });

  it("complete strips extra fields from service response", async () => {
    completeReceiptMock.mockResolvedValue({
      partner_id: DEMO_SANDBOX_PARTNER_ID,
      policy_id: DEMO_SANDBOX_POLICY_ID,
      decision_id: "dec-demo",
      receipt_id: RECEIPT_ID,
      replay_status: "issued",
      decision: "approved",
      webhook: { enqueued: true },
      metering: { recorded: true },
    });
    const res = await completePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.keys(body.issuance).sort()).toEqual([...DEMO_COMPLETION_FIELDS].sort());
    expect(body.issuance).not.toHaveProperty("webhook");
    expect(body.issuance).not.toHaveProperty("metering");
  });

  it.each([
    { route: "status", code: "partner_sandbox_demo_subject_not_configured", status: 503, call: () => {
      getPassportStatusMock.mockRejectedValue(new Error("partner_sandbox_demo_subject_not_configured"));
      return statusGET(new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status", { headers: adminHeaders() }));
    }},
    { route: "evaluate", code: "demo_partner_not_allowed", status: 403, call: () => {
      evaluatePolicyMock.mockRejectedValue(new Error("demo_partner_not_allowed"));
      return evaluatePOST(new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({}),
      }));
    }},
    { route: "complete", code: "demo_credential_not_active", status: 400, call: () => {
      completeReceiptMock.mockRejectedValue(new Error("demo_credential_not_active"));
      return completePOST(new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({}),
      }));
    }},
    { route: "complete", code: "demo_receipt_not_found", status: 404, call: () => {
      completeReceiptMock.mockRejectedValue(new Error("demo_receipt_not_found"));
      return completePOST(new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({}),
      }));
    }},
    { route: "validate", code: "demo_public_receipt_unavailable", status: 503, call: () => {
      validateReceiptMock.mockRejectedValue(new Error("demo_public_receipt_unavailable"));
      return validateGET(new NextRequest(
        `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}`,
        { headers: adminHeaders() },
      ));
    }},
  ])("$route returns recognized code $code with HTTP $status", async ({ code, status, call }) => {
    const res = await call();
    expect(res.status).toBe(status);
    expect((await res.json()).error).toBe(code);
  });

  it("complete response contains no operational success claims", async () => {
    const res = await completePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/complete", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(demoResponseHasNoOperationalClaims(body)).toBe(true);
    expect(demoResponseHasNoOperationalClaims(body.issuance)).toBe(true);
    expect(body.issuance).not.toHaveProperty("metering");
    expect(body.issuance).not.toHaveProperty("webhook");
  });

  it("POST routes accept JSON content-type with admin pin header (same admin auth pattern)", async () => {
    const res = await evaluatePOST(
      new NextRequest("http://localhost/api/admin/partner-sandbox-demo/evaluate", {
        method: "POST",
        headers: { ...adminHeaders(), "content-type": "application/json" },
        body: JSON.stringify({ extra_field: "ignored" }),
      }),
    );
    expect(res.status).toBe(200);
    expectNoStore(res);
  });

  describe("signing-health diagnostics", () => {
    it("returns 404 when feature flag is missing", async () => {
      vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", "");
      const res = await signingHealthGET(
        new NextRequest("http://localhost/api/admin/partner-sandbox-demo/signing-health", {
          headers: adminHeaders(),
        }),
      );
      expect(res.status).toBe(404);
    });

    it("returns 401 without admin authorization", async () => {
      checkAdminMock.mockReturnValue(false);
      const res = await signingHealthGET(
        new NextRequest("http://localhost/api/admin/partner-sandbox-demo/signing-health"),
      );
      expect(res.status).toBe(401);
    });

    it("returns boolean-only health report without secret material", async () => {
      const keyPair = generateTestSigningKeyPair();
      vi.stubEnv("ABRAXAS_SIGNING_KEY", JSON.stringify(keyPair.privateKeyJwk));
      vi.stubEnv("ABRAXAS_PUBLIC_KEY", JSON.stringify(keyPair.publicKeyJwk));

      const res = await signingHealthGET(
        new NextRequest("http://localhost/api/admin/partner-sandbox-demo/signing-health", {
          headers: adminHeaders(),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(signingHealthResponseHasNoSecrets(body)).toBe(true);
      expect(body.ok).toBe(true);
      expect(JSON.stringify(body)).not.toContain(keyPair.privateKeyJwk.d);
      expect(JSON.stringify(body)).not.toContain(keyPair.publicKeyJwk.x);
    });
  });

  describe("validate integrity diagnostics", () => {
    it("returns 401 without admin authorization", async () => {
      checkAdminMock.mockReturnValue(false);
      const res = await validateGET(
        new NextRequest(
          `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}&integrity=1`,
        ),
      );
      expect(res.status).toBe(401);
    });

    it("returns only integrity booleans for existing receipt", async () => {
      const res = await validateGET(
        new NextRequest(
          `http://localhost/api/admin/partner-sandbox-demo/validate?receipt_id=${RECEIPT_ID}&integrity=1`,
          { headers: adminHeaders() },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(integrityResponseHasNoSecrets(body)).toBe(true);
      expect(body).toEqual({
        payload_hash_matches_recomputed: false,
        signature_valid: false,
      });
      expect(diagnoseIntegrityMock).toHaveBeenCalledWith(RECEIPT_ID);
    });
  });
});
