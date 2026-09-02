// @vitest-environment jsdom
// FILE: lib/partner/partnerVerifyAuthDebug.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createPartnerVerifyCorrelationId,
  logPartnerVerifyAuthEvent,
  sanitizePartnerVerifyAuthPayload,
} from "./partnerVerifyAuthDebug";

describe("partnerVerifyAuthDebug sanitization", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("strips forbidden fields from partner verify diagnostics", () => {
    const safe = sanitizePartnerVerifyAuthPayload({
      correlationId: createPartnerVerifyCorrelationId(),
      outcome: "enter",
      return_url: "https://partner.example?gtv=1",
      suiAddress: "0xabc",
      id_token: "jwt",
      email: "a@b.com",
      errorCode: "401",
    });

    expect(safe.outcome).toBe("enter");
    expect(safe.errorCode).toBe("401");
    expect(JSON.stringify(safe)).not.toMatch(/return_url|gtv|0x|@|jwt/i);
  });

  it("never emits forbidden fields through logPartnerVerifyAuthEvent", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const forbidden = {
      correlationId: createPartnerVerifyCorrelationId(),
      outcome: "enter",
      return_url: "https://evil.example",
      gtv: "secret-gtv",
    } as Record<string, unknown>;

    logPartnerVerifyAuthEvent(
      "partner_evaluate_result",
      sanitizePartnerVerifyAuthPayload(forbidden),
    );

    const emitted = JSON.stringify(info.mock.calls[0]);
    expect(emitted).not.toMatch(/return_url|gtv|secret/i);
    expect(emitted).toContain("partner_evaluate_result");
  });
});
