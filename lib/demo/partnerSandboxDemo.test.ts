// FILE: lib/demo/partnerSandboxDemo.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  isPartnerSandboxDemoEnabled,
  resolvePartnerSandboxDemoSubjectId,
} from "@/lib/demo/partnerSandboxDemoConfig";
import {
  assertSandboxDemoPartnerPolicy,
  assertSandboxDemoReceipt,
  rejectClientSuppliedSubject,
  validateDemoReceiptId,
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import {
  buildDemoPassportStatusView,
  demoViewHasNoForbiddenKeys,
  demoResponseHasNoOperationalClaims,
  DEMO_COMPLETION_NEUTRAL_OPS_NOTE,
  toDemoPublicReceiptView,
  DEMO_PUBLIC_RECEIPT_FIELDS,
} from "@/lib/demo/partnerSandboxDemoViews";
import { guardPartnerSandboxDemoRoute } from "@/lib/demo/partnerSandboxDemoRouteGuard";

vi.mock("@/lib/adminAuth", () => ({
  checkAdmin: vi.fn(),
}));

import { checkAdmin } from "@/lib/adminAuth";

const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

describe("partnerSandboxDemoConfig", () => {
  it("requires trimmed lowercase true for feature flag", () => {
    expect(isPartnerSandboxDemoEnabled({ PARTNER_SANDBOX_DEMO_ENABLED: "true" })).toBe(true);
    expect(isPartnerSandboxDemoEnabled({ PARTNER_SANDBOX_DEMO_ENABLED: " true " })).toBe(true);
    expect(isPartnerSandboxDemoEnabled({ PARTNER_SANDBOX_DEMO_ENABLED: " TRUE " })).toBe(false);
    expect(isPartnerSandboxDemoEnabled({ PARTNER_SANDBOX_DEMO_ENABLED: "True" })).toBe(false);
    expect(isPartnerSandboxDemoEnabled({ PARTNER_SANDBOX_DEMO_ENABLED: "false" })).toBe(false);
    expect(isPartnerSandboxDemoEnabled({ PARTNER_SANDBOX_DEMO_ENABLED: "1" })).toBe(false);
    expect(isPartnerSandboxDemoEnabled({ PARTNER_SANDBOX_DEMO_ENABLED: "   " })).toBe(false);
    expect(isPartnerSandboxDemoEnabled({})).toBe(false);
  });

  it("resolves configured subject only when flag enabled", () => {
    const env = {
      PARTNER_SANDBOX_DEMO_ENABLED: "true",
      PARTNER_SANDBOX_DEMO_SUBJECT_ID: SUBJECT,
    };
    expect(resolvePartnerSandboxDemoSubjectId(env)).toEqual({ ok: true, subjectId: SUBJECT });
    expect(resolvePartnerSandboxDemoSubjectId({ PARTNER_SANDBOX_DEMO_ENABLED: "true" })).toEqual({
      ok: false,
      error: "partner_sandbox_demo_subject_not_configured",
    });
  });
});

describe("partnerSandboxDemoBoundaries", () => {
  it("accepts only exact sandbox partner and policy", () => {
    expect(() =>
      assertSandboxDemoPartnerPolicy({
        partnerId: DEMO_SANDBOX_PARTNER_ID,
        policyId: DEMO_SANDBOX_POLICY_ID,
      }),
    ).not.toThrow();
    expect(() =>
      assertSandboxDemoPartnerPolicy({
        partnerId: "good-trouble-cannabis",
        policyId: DEMO_SANDBOX_POLICY_ID,
      }),
    ).toThrow("demo_partner_not_allowed");
    expect(() =>
      assertSandboxDemoPartnerPolicy({
        partnerId: DEMO_SANDBOX_PARTNER_ID,
        policyId: "good-trouble-retail-v1",
      }),
    ).toThrow("demo_policy_not_allowed");
  });

  it("rejects non-sandbox receipts", () => {
    expect(() =>
      assertSandboxDemoReceipt({
        partner_id: DEMO_SANDBOX_PARTNER_ID,
        policy_id: DEMO_SANDBOX_POLICY_ID,
        decision_context: "production",
      } as never),
    ).toThrow("demo_receipt_not_sandbox");
  });

  it("rejects client-supplied subject identifiers", () => {
    expect(() => rejectClientSuppliedSubject({ bodySubjectId: SUBJECT })).toThrow(
      "client_subject_not_allowed",
    );
    expect(() => rejectClientSuppliedSubject({ querySubjectId: SUBJECT })).toThrow(
      "client_subject_not_allowed",
    );
  });

  it("validates receipt id format and length", () => {
    expect(validateDemoReceiptId("dr_sandbox_demo_receipt01")).toEqual({
      ok: true,
      receiptId: "dr_sandbox_demo_receipt01",
    });
    expect(validateDemoReceiptId("")).toEqual({ ok: false, error: "receipt_id_required" });
    expect(validateDemoReceiptId("not-a-receipt")).toEqual({ ok: false, error: "receipt_id_invalid" });
    expect(validateDemoReceiptId(`dr_${"x".repeat(200)}`)).toEqual({
      ok: false,
      error: "receipt_id_invalid",
    });
  });
});

describe("partnerSandboxDemoViews", () => {
  it("builds passport status without forbidden keys", () => {
    const view = buildDemoPassportStatusView({
      credentialStatus: "active",
      activeClaimTypes: ["identity_verified", "wallet_binding_confirmed"],
    });
    expect(view.label).toContain("Synthetic sandbox holder");
    expect(view.required_claim_types_missing).toContain("screening_outcome");
    expect(demoViewHasNoForbiddenKeys(view as unknown as Record<string, unknown>)).toBe(true);
  });

  it("allowlists public receipt fields only", () => {
    const view = toDemoPublicReceiptView({
      receipt_id: "dr_test",
      policy_id: DEMO_SANDBOX_POLICY_ID,
      decision_result: "approved",
      evaluated_at: "2026-08-10T00:00:00.000Z",
      expires_at: "2026-08-11T00:00:00.000Z",
      signature_valid: true,
      currently_valid: true,
      invalidation_reasons: [],
      subject_pseudonym_id: "must-not-appear",
      signature: "secret-signature",
    } as never);
    expect(Object.keys(view).sort()).toEqual([...DEMO_PUBLIC_RECEIPT_FIELDS].sort());
    expect(JSON.stringify(view)).not.toContain("subject_pseudonym");
    expect(JSON.stringify(view)).not.toContain("secret-signature");
    expect(demoViewHasNoForbiddenKeys(view as unknown as Record<string, unknown>)).toBe(true);
  });

  it("rejects operational success claim patterns", () => {
    expect(demoResponseHasNoOperationalClaims({ receipt_id: "dr_test", decision: "approved" })).toBe(true);
    expect(demoResponseHasNoOperationalClaims({ metering: { recorded: true } })).toBe(false);
    expect(demoResponseHasNoOperationalClaims({ webhook: { enqueued: true } })).toBe(false);
    expect(demoResponseHasNoOperationalClaims({ webhook_enqueued: true })).toBe(false);
    expect(demoResponseHasNoOperationalClaims({ metering_recorded: true })).toBe(false);
    expect(demoResponseHasNoOperationalClaims({ delivery_success: true })).toBe(false);
  });
});

describe("partnerSandboxDemoRouteGuard", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(checkAdmin).mockReset();
  });

  it("returns 404 when feature flag is missing", () => {
    vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", "");
    const req = new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status");
    const res = guardPartnerSandboxDemoRoute(req);
    expect(res?.status).toBe(404);
  });

  it("returns 401 for non-admin when flag enabled", () => {
    vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", "true");
    vi.mocked(checkAdmin).mockReturnValue(false);
    const req = new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status");
    const res = guardPartnerSandboxDemoRoute(req);
    expect(res?.status).toBe(401);
  });

  it("allows admin when flag enabled and pin valid", () => {
    vi.stubEnv("PARTNER_SANDBOX_DEMO_ENABLED", "true");
    vi.mocked(checkAdmin).mockReturnValue(true);
    const req = new NextRequest("http://localhost/api/admin/partner-sandbox-demo/status");
    expect(guardPartnerSandboxDemoRoute(req)).toBeNull();
  });
});

describe("partnerSandboxDemoClient presentation", () => {
  const clientSource = readFileSync(
    resolve(__dirname, "../../app/admin/partner-sandbox-demo/PartnerSandboxDemoClient.tsx"),
    "utf8",
  );
  const scriptSource = readFileSync(
    resolve(__dirname, "../../docs/demo/PARTNER_SANDBOX_PHASE1_SCRIPT.md"),
    "utf8",
  );

  it("does not render operational success language in the demo UI", () => {
    expect(clientSource).toContain("DEMO_COMPLETION_NEUTRAL_OPS_NOTE");
    expect(clientSource).toContain("${DEMO_COMPLETION_NEUTRAL_OPS_NOTE}");
    expect(clientSource).not.toMatch(/metering.*recorded/i);
    expect(clientSource).not.toMatch(/webhook.*enqueued/i);
    expect(clientSource).not.toMatch(/delivery_success/i);
  });

  it("presenter script avoids operational success claims", () => {
    expect(scriptSource).toContain(DEMO_COMPLETION_NEUTRAL_OPS_NOTE);
    expect(scriptSource).not.toMatch(/metering event recorded/i);
    expect(scriptSource).not.toMatch(/webhook notification enqueued/i);
    expect(demoResponseHasNoOperationalClaims(scriptSource)).toBe(true);
  });
});
