// FILE: lib/auth/ephemeralWallet/protocolEnvelope.test.ts

import { describe, expect, it } from "vitest";
import {
  buildWalletAuthorizationMessage,
  WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
} from "./protocolEnvelope";

describe("buildWalletAuthorizationMessage", () => {
  const base = {
    domain: "localhost:3000",
    audience: "abraxas_ephemeral_wallet",
    walletAddress: "Abcd1234WalletAddressExample111111111111",
    uri: "https://localhost:3000/api/test",
    solanaNetwork: "devnet",
    nonce: "nonce123",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:05:00.000Z",
    requestId: "ewac_test_challenge",
    origin: "https://localhost:3000",
    purpose: WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
    operation: "sandbox:verification:test",
    resource: "abraxas:sandbox:ws:policy:wallet_control",
    policyId: "wallet_control",
  };

  it("includes human-readable policy binding for sandbox verification", () => {
    const message = buildWalletAuthorizationMessage({
      ...base,
      human: {
        actionTitle: "Authorize test verification",
        policyLabel: "Wallet Control",
        policyId: "wallet_control",
        environment: "Sandbox",
        requestedBy: "Abraxas Developer Workspace",
        fundsSafetyLine: "No token transfer or spending approval is requested.",
      },
    });
    expect(message).toContain("Protocol: Abraxas");
    expect(message).toContain("Action: Authorize test verification");
    expect(message).toContain("Policy: Wallet Control (wallet_control)");
    expect(message).toContain("Environment: Sandbox");
    expect(message).toContain("Operation: sandbox:verification:test");
    expect(message).toContain("Policy ID: wallet_control");
    expect(message).toContain("No token transfer or spending approval is requested.");
  });

  it("binds a different policy id in the technical record", () => {
    const message = buildWalletAuthorizationMessage({
      ...base,
      policyId: "age_21_retail",
      resource: "abraxas:sandbox:ws:policy:age_21_retail",
      human: {
        actionTitle: "Authorize test verification",
        policyLabel: "Age 21 (retail demo)",
        policyId: "age_21_retail",
        environment: "Sandbox",
        requestedBy: "Abraxas Developer Workspace",
      },
    });
    expect(message).toContain("Policy: Age 21 (retail demo) (age_21_retail)");
    expect(message).toContain("Policy ID: age_21_retail");
  });
});
