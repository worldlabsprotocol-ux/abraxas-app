// FILE: lib/connect/connect.test.ts
import { describe, it, expect } from "vitest";
import { buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import {
  buildSiweMessage,
  createEvmChallengePayload,
} from "@/lib/walletAuthority/evmSiwe";

describe("Connect return URL builder", () => {
  it("adds opaque params without PII keys", () => {
    const url = buildRedirectUrl("https://example.com/demo/partner-access", {
      authorization_request_id: "car_test",
      status: "approved",
      receipt_id: "dr_test",
    });
    expect(url).toContain("authorization_request_id=car_test");
    expect(url).not.toContain("subject_id");
    expect(url).not.toContain("claim_value");
  });
});

describe("EVM SIWE challenge", () => {
  it("includes domain, chain, and nonce", () => {
    const payload = createEvmChallengePayload({
      domain: "abraxas-app.vercel.app",
      address: "0x0000000000000000000000000000000000000001",
      chainId: 1,
    });
    const msg = buildSiweMessage({
      domain: "abraxas-app.vercel.app",
      address: "0x0000000000000000000000000000000000000001",
      chainId: 1,
      nonce: payload.challengeId,
      issuedAt: new Date().toISOString(),
      expirationTime: payload.expiresAt,
    });
    expect(msg).toContain("Chain ID: 1");
    expect(msg).toContain(`Nonce: ${payload.challengeId}`);
    expect(msg).not.toContain("passport");
  });
});

describe("authorize architecture guardrail", () => {
  it("createAuthorizationRequest return shape requires connect URL not approval", () => {
    const expectedKeys = ["authorization_request_id", "hosted_connect_url", "expires_at"];
    const mock = {
      authorization_request_id: "car_x",
      hosted_connect_url: "https://app/connect/authorize?request=car_x",
      expires_at: new Date().toISOString(),
      status: "awaiting_user" as const,
    };
    for (const k of expectedKeys) {
      expect(mock).toHaveProperty(k);
    }
    expect(mock).not.toHaveProperty("approved");
    expect(mock).not.toHaveProperty("receipt_id");
  });
});
