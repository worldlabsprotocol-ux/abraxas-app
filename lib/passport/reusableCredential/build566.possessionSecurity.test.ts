// FILE: lib/passport/reusableCredential/build566.possessionSecurity.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import nacl from "tweetnacl";
import { BUILD_546_FIXTURE_NOW } from "@/lib/institutionalCertification/build546/fixtures";
import {
  BUILD_566_HOLDER_POSSESSION_KEYPAIR,
  BUILD_566_PARTNER_A,
  BUILD_566_POLICY_ID,
  build566SyntheticReusableCredential,
} from "./fixtures";
import {
  issuePassportPossessionChallenge,
  resetPassportPossessionChallengeStoreForTests,
  signPassportPossessionChallenge,
  verifyPassportPossessionProof,
} from "./holderPossessionChallenge";

describe("Build #566 holder possession challenge security", () => {
  beforeEach(() => {
    resetPassportPossessionChallengeStoreForTests();
  });

  it("accepts a valid holder signature once", () => {
    const credential = build566SyntheticReusableCredential();
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const result = verifyPassportPossessionProof({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      credentialHolderPublicKey: credential.payload.holder_possession_public_key,
      challenge,
      proof: {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, BUILD_566_HOLDER_POSSESSION_KEYPAIR.secretKey),
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(result.ok, result.ok ? "" : (result as { code: string }).code).toBe(true);
  });

  it("failed signature does not consume the challenge", () => {
    const credential = build566SyntheticReusableCredential();
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const attacker = nacl.sign.keyPair();
    const bad = verifyPassportPossessionProof({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      credentialHolderPublicKey: credential.payload.holder_possession_public_key,
      challenge,
      proof: {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, attacker.secretKey),
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.code).toBe("possession_signature_invalid");

    const good = verifyPassportPossessionProof({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      credentialHolderPublicKey: credential.payload.holder_possession_public_key,
      challenge,
      proof: {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, BUILD_566_HOLDER_POSSESSION_KEYPAIR.secretKey),
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(good.ok).toBe(true);
  });

  it("rejects substituted challenge payload not matching store record", () => {
    const credential = build566SyntheticReusableCredential();
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const substituted = { ...challenge, nonce: "attacker-nonce" };
    const result = verifyPassportPossessionProof({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      credentialHolderPublicKey: credential.payload.holder_possession_public_key,
      challenge: substituted,
      proof: {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, BUILD_566_HOLDER_POSSESSION_KEYPAIR.secretKey),
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("challenge_substituted");
  });

  it("rejects unknown challenge identifiers", () => {
    const credential = build566SyntheticReusableCredential();
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const result = verifyPassportPossessionProof({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      credentialHolderPublicKey: credential.payload.holder_possession_public_key,
      challenge,
      proof: {
        challenge_id: "poss_unknown",
        signature: signPassportPossessionChallenge(challenge, BUILD_566_HOLDER_POSSESSION_KEYPAIR.secretKey),
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(result.ok).toBe(false);
  });
});
