import { describe, expect, it, vi } from "vitest";
import {
  FORBIDDEN_CALLBACK_KEYS,
  validateCallbackSearchParams,
} from "./lib/callbackParams";
import { resolveStarterConfig, STARTER_ENV_KEYS } from "./lib/config";
import {
  isStarterSessionActive,
  signStarterSession,
  verifyStarterSession,
} from "./lib/session";
import {
  publicAccessSummary,
  verifyReceiptServerSide,
} from "./lib/verifyReceipt";
import { STARTER_BASE_PATH } from "./lib/constants";
import { SITE_URL } from "@/lib/siteUrl";

const VALID_ENV = {
  [STARTER_ENV_KEYS.partnerId]: "acme-protocol",
  [STARTER_ENV_KEYS.policyId]: "acme-gate-v1",
  [STARTER_ENV_KEYS.returnUrl]: `http://localhost:3000${STARTER_BASE_PATH}/callback`,
  [STARTER_ENV_KEYS.baseUrl]: SITE_URL,
  [STARTER_ENV_KEYS.sessionSecret]: "test-session-secret-at-least-32-chars-long",
};

function validReceipt(overrides: Record<string, unknown> = {}) {
  return {
    receipt_id: "dr_test",
    partner_id: "acme-protocol",
    policy_id: "acme-gate-v1",
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: true,
    ...overrides,
  };
}

describe("partner access nextjs starter", () => {
  it("does not reference stale abraxas-app.vercel.app in starter config", () => {
    const result = validateCallbackSearchParams(new URLSearchParams({
      receipt_id: "dr_test",
      partner_id: "acme-protocol",
      policy_id: "acme-gate-v1",
      status: "approved",
    }));
    expect(result.ok).toBe(true);
    expect(VALID_ENV[STARTER_ENV_KEYS.returnUrl]).not.toContain("abraxas-app.vercel.app");
  });

  it("rejects callback URLs containing stale vercel host in env validation", () => {
    const resolved = resolveStarterConfig({
      ...VALID_ENV,
      [STARTER_ENV_KEYS.returnUrl]: "https://abraxas-app.vercel.app/examples/partner-access-starter/callback",
    });
    expect(resolved.returnUrlErrors).toContain("return_url_contains_stale_vercel_host");
  });

  it("accepts only frozen callback parameters", () => {
    const params = new URLSearchParams({
      status: "approved",
      receipt_id: "dr_abc",
      partner_id: "acme-protocol",
      policy_id: "acme-gate-v1",
      decision_id: "dec-1",
    });
    const result = validateCallbackSearchParams(params);
    expect(result.ok).toBe(true);
    expect(result.params?.receipt_id).toBe("dr_abc");
  });

  it("rejects unknown and forbidden callback parameters (no PII)", () => {
    for (const forbidden of FORBIDDEN_CALLBACK_KEYS) {
      const params = new URLSearchParams({
        receipt_id: "dr_abc",
        [forbidden]: "leaked-value",
      });
      const result = validateCallbackSearchParams(params);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("forbidden") || e.includes("unknown"))).toBe(true);
    }
  });

  it("grants access when public receipt is valid", async () => {
    const config = resolveStarterConfig(VALID_ENV).config!;
    const result = await verifyReceiptServerSide({
      receiptId: "dr_test",
      config,
      allowSandbox: false,
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validReceipt(),
      }) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("denies access for invalid signature", async () => {
    const config = resolveStarterConfig(VALID_ENV).config!;
    const result = await verifyReceiptServerSide({
      receiptId: "dr_test",
      config,
      allowSandbox: false,
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validReceipt({ signature_valid: false }),
      }) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("signature_invalid");
  });

  it("denies access for expired receipt", async () => {
    const config = resolveStarterConfig(VALID_ENV).config!;
    const result = await verifyReceiptServerSide({
      receiptId: "dr_test",
      config,
      allowSandbox: false,
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validReceipt({ expires_at: "2020-01-01T00:00:00.000Z" }),
      }) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("receipt_expired");
  });

  it("denies access for wrong partner", async () => {
    const config = resolveStarterConfig(VALID_ENV).config!;
    const result = await verifyReceiptServerSide({
      receiptId: "dr_test",
      config,
      allowSandbox: false,
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validReceipt({ partner_id: "other-partner" }),
      }) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("partner_mismatch"))).toBe(true);
  });

  it("denies access for wrong policy", async () => {
    const config = resolveStarterConfig(VALID_ENV).config!;
    const result = await verifyReceiptServerSide({
      receiptId: "dr_test",
      config,
      allowSandbox: false,
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validReceipt({ policy_id: "other-policy" }),
      }) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("policy_mismatch"))).toBe(true);
  });

  it("signed session round-trips without PII fields", () => {
    const secret = "test-session-secret-at-least-32-chars-long";
    const session = {
      receiptId: "dr_test",
      partnerId: "acme-protocol",
      policyId: "acme-gate-v1",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };
    const token = signStarterSession(session, secret);
    const verified = verifyStarterSession(token, secret);
    expect(verified).toEqual(session);
    expect(isStarterSessionActive(verified!)).toBe(true);
  });

  it("public access summary excludes identity fields", () => {
    const summary = publicAccessSummary({
      ...validReceipt(),
      // @ts-expect-error — simulate fields that must not leak
      email: "user@example.com",
      wallet_address: "0xabc",
    });
    expect(summary).not.toHaveProperty("email");
    expect(summary).not.toHaveProperty("wallet_address");
    expect(summary.receipt_id).toBe("dr_test");
  });

  it("does not hardcode Good Trouble pilot ids", () => {
    const resolved = resolveStarterConfig(VALID_ENV);
    expect(resolved.config?.partnerId).not.toContain("good-trouble");
    expect(resolved.config?.policyId).not.toContain("good-trouble");
  });
});
