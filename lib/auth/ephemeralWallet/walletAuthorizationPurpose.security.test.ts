// FILE: lib/auth/ephemeralWallet/walletAuthorizationPurpose.security.test.ts

import { describe, expect, it } from "vitest";
import { buildEphemeralWalletSignInMessage } from "./message";
import {
  buildWalletAuthorizationMessage,
  WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
  WALLET_AUTH_PURPOSE_TRUST_EXECUTION,
} from "./protocolEnvelope";
import {
  assertPurposeAllowedForSignInVerification,
  assertPurposeAllowedForSandboxActionVerification,
  assertPurposeAllowedForTrustExecutionVerification,
  isWalletAuthorizationPurpose,
  parseWalletAuthorizationPurposeFromMessage,
} from "./walletAuthorizationPurpose";
import { buildWalletScopedTrustExecutionMessage } from "@/lib/auth/walletAuthorization/scopedExecutionEnvelope";

describe("wallet authorization purpose contract", () => {
  it("recognizes trust execution in the canonical purpose set", () => {
    expect(isWalletAuthorizationPurpose(WALLET_AUTH_PURPOSE_TRUST_EXECUTION)).toBe(true);
  });

  it("rejects unknown purpose strings", () => {
    expect(isWalletAuthorizationPurpose("abraxas_wallet_admin_v1")).toBe(false);
    expect(parseWalletAuthorizationPurposeFromMessage("Purpose: abraxas_wallet_admin_v1")).toBe(null);
  });

  it("does not treat trust execution as sign-in verification", () => {
    const message = buildWalletScopedTrustExecutionMessage({
      domain: "trust.abraxas.test",
      audience: "abraxas_wallet_trust_execution",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      uri: "https://trust.abraxas.test/trust",
      solanaNetwork: "devnet",
      nonce: "n1",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
      requestId: "wsc_purpose_test",
      origin: "https://trust.abraxas.test",
      partnerId: "partner-test",
      applicationId: "00000000-0000-4000-8000-000000008853",
      action: "partner_flow:evaluate",
      resource: "abraxas:trust:evaluate",
      policyId: "policy-test",
    });
    const purpose = parseWalletAuthorizationPurposeFromMessage(message);
    expect(assertPurposeAllowedForTrustExecutionVerification(purpose).ok).toBe(true);
    expect(assertPurposeAllowedForSignInVerification(purpose).ok).toBe(false);
    expect(assertPurposeAllowedForSandboxActionVerification(purpose).ok).toBe(false);
  });

  it("does not treat sign-in message as trust execution or sandbox action", () => {
    const message = buildEphemeralWalletSignInMessage({
      domain: "localhost:3000",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      uri: "https://localhost:3000/",
      solanaNetwork: "devnet",
      nonce: "n1",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z",
      challengeId: "ewch_test",
      origin: "https://localhost:3000",
    });
    const purpose = parseWalletAuthorizationPurposeFromMessage(message);
    expect(assertPurposeAllowedForSignInVerification(purpose).ok).toBe(true);
    expect(assertPurposeAllowedForTrustExecutionVerification(purpose).ok).toBe(false);
  });

  it("rejects purpose substitution between sign-in and sandbox action classes", () => {
    const signIn = buildEphemeralWalletSignInMessage({
      domain: "localhost:3000",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      uri: "https://localhost:3000/",
      solanaNetwork: "devnet",
      nonce: "n1",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z",
      challengeId: "ewch_test",
      origin: "https://localhost:3000",
    });
    const tampered = signIn.replace("abraxas_wallet_sign_in_v1", WALLET_AUTH_PURPOSE_TRUST_EXECUTION);
    expect(parseWalletAuthorizationPurposeFromMessage(tampered)).toBe(WALLET_AUTH_PURPOSE_TRUST_EXECUTION);
    expect(assertPurposeAllowedForSignInVerification(parseWalletAuthorizationPurposeFromMessage(tampered)).ok).toBe(
      false,
    );

    const sandbox = buildWalletAuthorizationMessage({
      domain: "localhost:3000",
      audience: "abraxas_ephemeral_wallet",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      uri: "https://localhost:3000/api/test",
      solanaNetwork: "devnet",
      nonce: "n2",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z",
      requestId: "ewac_test",
      origin: "https://localhost:3000",
      purpose: WALLET_AUTH_PURPOSE_SANDBOX_TEST_VERIFY,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws:policy:wallet_control",
      policyId: "wallet_control",
    });
    expect(assertPurposeAllowedForSandboxActionVerification(parseWalletAuthorizationPurposeFromMessage(sandbox)).ok).toBe(
      true,
    );
  });
});
