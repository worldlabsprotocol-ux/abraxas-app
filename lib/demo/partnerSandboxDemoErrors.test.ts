// FILE: lib/demo/partnerSandboxDemoErrors.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  PARTNER_SANDBOX_DEMO_INTERNAL_ERROR,
  classifyPartnerSandboxDemoError,
  isRecognizedPartnerSandboxDemoErrorCode,
  logPartnerSandboxDemoInternalError,
  partnerSandboxDemoErrorFingerprint,
} from "@/lib/demo/partnerSandboxDemoErrors";

const RECOGNIZED_ERRORS: Array<{ code: string; status: number }> = [
  { code: "demo_receipt_not_found", status: 404 },
  { code: "client_subject_not_allowed", status: 400 },
  { code: "client_partner_policy_not_allowed", status: 400 },
  { code: "receipt_id_required", status: 400 },
  { code: "receipt_id_invalid", status: 400 },
  { code: "demo_credential_not_active", status: 400 },
  { code: "partner_sandbox_demo_subject_invalid", status: 400 },
  { code: "demo_partner_not_allowed", status: 403 },
  { code: "demo_policy_not_allowed", status: 403 },
  { code: "demo_receipt_partner_not_allowed", status: 403 },
  { code: "demo_receipt_policy_not_allowed", status: 403 },
  { code: "demo_receipt_not_sandbox", status: 403 },
  { code: "partner_sandbox_demo_subject_not_configured", status: 503 },
  { code: "demo_public_receipt_unavailable", status: 503 },
];

const SENSITIVE_MESSAGE =
  "Supabase failed for subject 0x123 with postgres connection secret";

describe("partnerSandboxDemoErrors", () => {
  it.each(RECOGNIZED_ERRORS)("maps $code to HTTP $status", ({ code, status }) => {
    expect(isRecognizedPartnerSandboxDemoErrorCode(code)).toBe(true);
    expect(classifyPartnerSandboxDemoError(new Error(code))).toEqual({ status, error: code });
  });

  it("maps unknown errors to internal 500 without leaking message", () => {
    const classified = classifyPartnerSandboxDemoError(new Error(SENSITIVE_MESSAGE));
    expect(classified).toEqual({
      status: 500,
      error: PARTNER_SANDBOX_DEMO_INTERNAL_ERROR,
    });
    expect(classified.error).not.toContain("Supabase");
    expect(classified.error).not.toContain("secret");
  });

  it("maps non-Error values to internal 500", () => {
    expect(classifyPartnerSandboxDemoError("unexpected")).toEqual({
      status: 500,
      error: PARTNER_SANDBOX_DEMO_INTERNAL_ERROR,
    });
  });

  it("logs only operation, category, and fingerprint", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logPartnerSandboxDemoInternalError("partner_sandbox_demo.status", new Error(SENSITIVE_MESSAGE));
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("operation=partner_sandbox_demo.status");
    expect(line).toContain(`category=${PARTNER_SANDBOX_DEMO_INTERNAL_ERROR}`);
    expect(line).toContain(`fingerprint=${partnerSandboxDemoErrorFingerprint(new Error(SENSITIVE_MESSAGE))}`);
    expect(line).not.toContain("Supabase");
    expect(line).not.toContain("postgres");
    expect(line).not.toContain("secret");
    expect(line).not.toContain("0x123");
    warn.mockRestore();
  });
});
