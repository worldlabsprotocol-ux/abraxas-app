// FILE: lib/auth/ephemeralWallet/walletScopedAuthorizationMessage.test.ts

import { describe, expect, it } from "vitest";
import { buildWalletAuthorizationMessage, WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY } from "./protocolEnvelope";
import { resolveWalletActionHumanContext } from "./actionDisplayContext";

describe("scoped wallet authorization message", () => {
  it("orders authorization facts before financial safety", () => {
    const human = resolveWalletActionHumanContext({
      operation: "sandbox:verification:test",
      policyId: "age_21_retail",
    });
    const message = buildWalletAuthorizationMessage({
      domain: "localhost:3000",
      audience: "abraxas_ephemeral_wallet",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      uri: "https://localhost:3000/api/test",
      solanaNetwork: "devnet",
      nonce: "nonce123",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z",
      requestId: "ewac_test",
      origin: "https://localhost:3000",
      purpose: WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws:policy:age_21_retail",
      policyId: "age_21_retail",
      human,
    });
    expect(message).toContain("What you approve:");
    expect(message).toContain("Recipient:");
    expect(message.indexOf("Financial safety")).toBeGreaterThan(message.indexOf("Recipient:"));
    expect(message).toContain("Authorization consequence:");
    expect(message).toContain("Age 21 demonstration");
  });
});
