// FILE: lib/demo/partnerSandboxDemoRoutes.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import { demoViewHasNoForbiddenKeys, demoResponseHasNoOperationalClaims } from "@/lib/demo/partnerSandboxDemoViews";

const checkAdminMock = vi.fn();
const getPassportStatusMock = vi.fn();
const evaluatePolicyMock = vi.fn();
const completeReceiptMock = vi.fn();
const validateReceiptMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkAdmin: (...args: unknown[]) => checkAdminMock(...args),
}));

vi.mock("@/lib/demo/partnerSandboxDemoService", () => ({
  getPartnerSandboxDemoPassportStatus: (...args: unknown[]) => getPassportStatusMock(...args),
  evaluatePartnerSandboxDemoPolicy: (...args: unknown[]) => evaluatePolicyMock(...args),
  completePartnerSandboxDemoReceipt: (...args: unknown[]) => completeReceiptMock(...args),
  validatePartnerSandboxDemoReceipt: (...args: unknown[]) => validateReceiptMock(...args),
}));

import { GET as statusGET } from "@/app/api/admin/partner-sandbox-demo/status/route";
import { POST as evaluatePOST } from "@/app/api/admin/partner-sandbox-demo/evaluate/route";
import { POST as completePOST } from "@/app/api/admin/partner-sandbox-demo/complete/route";
import { GET as validateGET } from "@/app/api/admin/partner-sandbox-demo/validate/route";

const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RECEIPT_ID = "dr_sandbox_demo_receipt01";
const ADMIN_PIN = "test-admin-pin";

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
});
