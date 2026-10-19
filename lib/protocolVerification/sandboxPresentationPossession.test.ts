// FILE: lib/protocolVerification/sandboxPresentationPossession.test.ts

import { describe, expect, it } from "vitest";
import { buildEphemeralSandboxAgeTestCredential } from "./ephemeralAuthorizedTestIssuer";
import { deriveEphemeralSandboxPossessionSecretKey } from "@/lib/auth/ephemeralWallet/sandboxHolderPossessionKey.shared";
import {
  InMemoryPassportPossessionChallengeStore,
  issuePassportPossessionChallenge,
} from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import { signPassportPossessionChallenge } from "@/lib/passport/reusableCredential/holderPossessionChallengeSigning";
import { verifySandboxPresentationPossessionAuthorization } from "./sandboxPresentationPossession.server";
import { EPHEMERAL_SANDBOX_TEST_PARTNER_ID } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";
import type { SandboxPresentationCommitRecord } from "@/lib/auth/ephemeralWallet/sandboxPresentationCommitStore";

const WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQos6UqK";

function baseCommit(challengeStore: InMemoryPassportPossessionChallengeStore): {
  commit: SandboxPresentationCommitRecord;
  challenge: ReturnType<typeof issuePassportPossessionChallenge>;
  bundle: ReturnType<typeof buildEphemeralSandboxAgeTestCredential>;
} {
  const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: WALLET });
  const challenge = issuePassportPossessionChallenge({
    credentialId: bundle.credential.payload.credential_id,
    partnerId: EPHEMERAL_SANDBOX_TEST_PARTNER_ID,
    policyId: "age_21_retail",
    store: challengeStore,
  });
  const commit: SandboxPresentationCommitRecord = {
    commit_id: "esbx_pc_poss_test",
    session_id: "sess_1",
    workspace_id: "ws_1",
    wallet_address: WALLET,
    policy_id: "age_21_retail",
    policy_version: 1,
    presentation_method_id: "authorized_test_issuer_credential",
    evidence_hash: "abc",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    sandbox_labeled: true,
    production_trusted: false,
    possession_challenge: challenge,
    possession_authorized_at: null,
  };
  return { commit, challenge, bundle };
}

describe("sandbox presentation possession", () => {
  it("accepts wallet bound possession proof for prepared credential", () => {
    const store = new InMemoryPassportPossessionChallengeStore();
    const { commit, challenge, bundle } = baseCommit(store);
    const secret = deriveEphemeralSandboxPossessionSecretKey(WALLET);
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, secret),
    };
    const result = verifySandboxPresentationPossessionAuthorization({
      commit,
      credential: bundle.credential,
      challenge,
      proof,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects possession proof from a different wallet binding", () => {
    const store = new InMemoryPassportPossessionChallengeStore();
    const { commit, challenge, bundle } = baseCommit(store);
    const otherWallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const secret = deriveEphemeralSandboxPossessionSecretKey(otherWallet);
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, secret),
    };
    const result = verifySandboxPresentationPossessionAuthorization({
      commit,
      credential: bundle.credential,
      challenge,
      proof,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("possession_signature_invalid");
  });

  it("rejects duplicate authorization on the same commit", () => {
    const store = new InMemoryPassportPossessionChallengeStore();
    const { commit, challenge, bundle } = baseCommit(store);
    const authorizedCommit = {
      ...commit,
      possession_authorized_at: new Date().toISOString(),
    };
    const secret = deriveEphemeralSandboxPossessionSecretKey(WALLET);
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, secret),
    };
    const result = verifySandboxPresentationPossessionAuthorization({
      commit: authorizedCommit,
      credential: bundle.credential,
      challenge,
      proof,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("presentation_possession_already_authorized");
  });
});
