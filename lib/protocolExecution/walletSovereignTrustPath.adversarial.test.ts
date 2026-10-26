// FILE: lib/protocolExecution/walletSovereignTrustPath.adversarial.test.ts

import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  syntheticSandboxReceipt,
  registryEnv,
} from "@/lib/persistence/boundary/staging/build834Fixtures";
import {
  buildWalletScopedTrustExecutionMessage,
  type WalletScopedTrustBinding,
} from "@/lib/auth/walletAuthorization/scopedExecutionEnvelope";
import {
  createInMemoryScopedChallengeStore,
} from "@/lib/auth/walletAuthorization/scopedChallengeLifecycle";
import {
  executeWalletSovereignTrustPath,
  signWalletScopedTrustMessage,
} from "./walletSovereignTrustPath";
import { verifyPassportSolanaPersonalMessage } from "@/lib/auth/passportSolanaAuth/verifySignature";

const APP_ID = "00000000-0000-4000-8000-000000008853";

function baseBinding(kp: Keypair): WalletScopedTrustBinding {
  return {
    domain: "trust.abraxas.test",
    audience: "abraxas_wallet_trust_execution",
    walletAddress: kp.publicKey.toBase58(),
    uri: "https://trust.abraxas.test/api/trust/execute",
    solanaNetwork: "devnet",
    nonce: "nonce-build853",
    issuedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2099-06-01T00:00:00.000Z",
    requestId: "wsc_build853_happy",
    origin: "https://trust.abraxas.test",
    partnerId: "partner-build834",
    applicationId: APP_ID,
    action: "partner_flow:evaluate",
    resource: "abraxas:trust:partner_flow:evaluate",
    policyId: "policy-build834",
    human: {
      actionTitle: "Authorize trust execution",
      authorizationSummary: "Evaluate policy-bound trust for this application.",
      environment: "Test",
    },
  };
}

describe("Build #853 wallet sovereign trust path (adversarial)", () => {
  it("happy path: wallet auth → test evidence → independent verification without Supabase", async () => {
    const kp = Keypair.generate();
    const receiptKey = generateTestSigningKeyPair("build853-issuer");
    const anchorKey = generateTestSigningKeyPair("build853-anchor");
    const statusSignerKey = generateTestSigningKeyPair("build853-status");
    const record = syntheticSandboxReceipt(receiptKey);
    const env = {
      ...registryEnv(receiptKey, anchorKey, {}),
      ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
      ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
      ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
    };

    const result = await executeWalletSovereignTrustPath({
      binding: baseBinding(kp),
      evidence: {
        label: "controlled_test_evidence",
        source: {
          source_credential_id: "cred_test_853",
          status: "active",
          expires_at: "2099-01-01T00:00:00.000Z",
          revoked_at: null,
        },
        claim_ids: ["claim_test_853"],
      },
      receipt: record,
      receiptKey,
      anchorKey,
      env,
      walletKeypair: kp,
    });

    expect(result.wallet_signature_valid).toBe(true);
    expect(result.challenge_consumed).toBe(true);
    expect(result.authorization_ref).toMatch(/^waev_/);
    expect(result.evidence_verdict.verdict).toBe("accepted");
    expect(result.independent_verification.cryptographically_authentic).toBe(true);
    expect(result.independent_verification.currently_acceptable).toBe("yes");
    expect(result.uses_supabase_for_verdict).toBe(false);
  });

  it("rejects replay on second challenge consume", async () => {
    const kp = Keypair.generate();
    const store = createInMemoryScopedChallengeStore();
    const binding = baseBinding(kp);
    const message = buildWalletScopedTrustExecutionMessage(binding);
    store.issue(binding, message);
    const sig = signWalletScopedTrustMessage(message, kp);
    expect(
      verifyPassportSolanaPersonalMessage({
        message,
        signature: sig,
        walletAddress: binding.walletAddress,
      }),
    ).toBe(true);

    const first = store.consume({
      challengeId: binding.requestId,
      message,
      walletAddress: binding.walletAddress,
      partnerId: binding.partnerId,
      applicationId: binding.applicationId,
      action: binding.action,
    });
    expect(first.ok).toBe(true);
    const replay = store.consume({
      challengeId: binding.requestId,
      message,
      walletAddress: binding.walletAddress,
      partnerId: binding.partnerId,
      applicationId: binding.applicationId,
      action: binding.action,
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.reason).toBe("challenge_already_consumed");
  });

  it("rejects wrong application binding", () => {
    const kp = Keypair.generate();
    const store = createInMemoryScopedChallengeStore();
    const binding = baseBinding(kp);
    const message = buildWalletScopedTrustExecutionMessage(binding);
    store.issue(binding, message);
    const wrong = store.consume({
      challengeId: binding.requestId,
      message,
      walletAddress: binding.walletAddress,
      partnerId: binding.partnerId,
      applicationId: "00000000-0000-4000-8000-000000009999",
      action: binding.action,
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.reason).toBe("application_mismatch");
  });

  it("fail-closed when test evidence is revoked", async () => {
    const kp = Keypair.generate();
    const receiptKey = generateTestSigningKeyPair("build853-deny");
    const anchorKey = generateTestSigningKeyPair("build853-deny-anchor");
    const statusSignerKey = generateTestSigningKeyPair("build853-deny-status");
    const record = syntheticSandboxReceipt(receiptKey);
    const env = {
      ...registryEnv(receiptKey, anchorKey, {}),
      ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
      ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
      ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
    };

    await expect(
      executeWalletSovereignTrustPath({
        binding: baseBinding(kp),
        evidence: {
          label: "controlled_test_evidence",
          source: {
            source_credential_id: "cred_revoked",
            status: "revoked",
            expires_at: null,
            revoked_at: "2026-01-01T00:00:00.000Z",
          },
          claim_ids: ["claim_x"],
        },
        receipt: record,
        receiptKey,
        anchorKey,
        env,
        walletKeypair: kp,
      }),
    ).rejects.toThrow(/evidence_not_permit/);
  });
});
