// FILE: lib/auth/walletAuthorization/scopedExecutionEnvelope.test.ts

import { describe, expect, it } from "vitest";
import {
  buildWalletScopedTrustExecutionMessage,
  parseWalletScopedTrustExecutionBinding,
  WALLET_AUTH_PURPOSE_TRUST_EXECUTION,
} from "./scopedExecutionEnvelope";

describe("wallet scoped trust execution envelope", () => {
  const binding = {
    domain: "localhost:3000",
    audience: "abraxas_wallet_trust_execution",
    walletAddress: "Abcd1234WalletAddressExample111111111111",
    uri: "https://localhost:3000/api/trust",
    solanaNetwork: "devnet",
    nonce: "nonce853",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:10:00.000Z",
    requestId: "wsc_test_853",
    origin: "https://localhost:3000",
    partnerId: "partner-test-853",
    applicationId: "00000000-0000-4000-8000-000000008853",
    action: "partner_flow:evaluate",
    resource: "abraxas:trust:evaluate",
    policyId: "policy-test",
    human: {
      actionTitle: "Authorize trust execution",
      environment: "Test",
    },
  };

  it("binds tenant, application, and action in the authorization record", () => {
    const message = buildWalletScopedTrustExecutionMessage(binding);
    expect(message).toContain(`Purpose: ${WALLET_AUTH_PURPOSE_TRUST_EXECUTION}`);
    expect(message).toContain("Tenant ID: partner-test-853");
    expect(message).toContain(`Application ID: ${binding.applicationId}`);
    expect(message).toContain("Operation: partner_flow:evaluate");
  });

  it("round-trips parse of scoped binding fields", () => {
    const message = buildWalletScopedTrustExecutionMessage(binding);
    const parsed = parseWalletScopedTrustExecutionBinding(message);
    expect(parsed?.partnerId).toBe(binding.partnerId);
    expect(parsed?.applicationId).toBe(binding.applicationId);
    expect(parsed?.action).toBe(binding.action);
    expect(parsed?.policyId).toBe(binding.policyId);
    expect(parsed?.nonce).toBe(binding.nonce);
  });
});
