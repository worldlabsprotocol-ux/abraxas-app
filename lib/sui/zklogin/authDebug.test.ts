// @vitest-environment jsdom
// FILE: lib/sui/zklogin/authDebug.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createAuthCorrelationId,
  logAuthEvent,
  sanitizeAuthDebugPayload,
  toAuthErrorCode,
} from "./authDebug";

describe("authDebug sanitization", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("strips forbidden persistent identifiers when passed accidentally", () => {
    const safe = sanitizeAuthDebugPayload({
      suiAddress: "0xdeadbeef",
      sui_address: "0xabc",
      email: "user@example.com",
      oauth_sub: "google-sub",
      id_token: "jwt-token",
      return_url: "https://partner.example/callback?gtv=secret",
      gtv: "gtv-value",
      receiptId: "rcpt_123",
      verifier: "pkce-verifier",
      walletAddress: "0xwallet",
      correlationId: createAuthCorrelationId(),
      hasSigning: true,
    });

    expect(safe).toEqual({
      correlationId: expect.stringMatching(/^auth_[a-f0-9]+$/i),
      hasSigning: true,
    });
    expect(JSON.stringify(safe)).not.toMatch(/0x|@|gtv|jwt|verifier|receipt/i);
  });

  it("allowlists zklogin_complete-safe payload fields only", () => {
    const cid = createAuthCorrelationId();
    const safe = sanitizeAuthDebugPayload({ correlationId: cid, detail: "new_session" });
    expect(safe).toEqual({ correlationId: cid, detail: "new_session" });
  });

  it("rejects user-derived correlation identifiers", () => {
    const safe = sanitizeAuthDebugPayload({
      correlationId: "user@example.com",
      detail: "login_mode=canonical",
    });
    expect(safe.correlationId).toBeUndefined();
    expect(safe.detail).toBe("login_mode=canonical");
  });

  it("maps errors to stable codes without echoing message content", () => {
    expect(toAuthErrorCode("Sign-in already in progress. Wait a moment and try again."))
      .toBe("blocked_by_login_in_flight");
    expect(toAuthErrorCode("zklogin_oauth_audience_mismatch")).toBe("register_failed");
  });

  it("never emits forbidden fields through logAuthEvent", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const forbidden = {
      correlationId: createAuthCorrelationId(),
      suiAddress: "0xsecretaddress",
      email: "secret@example.com",
    } as Record<string, unknown>;

    logAuthEvent("zklogin_complete", sanitizeAuthDebugPayload(forbidden) as never);

    expect(info).toHaveBeenCalledOnce();
    const emitted = JSON.stringify(info.mock.calls[0]);
    expect(emitted).not.toMatch(/0x|@|secret/i);
    expect(emitted).toContain("zklogin_complete");
  });
});
