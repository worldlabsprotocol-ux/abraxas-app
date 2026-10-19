// FILE: lib/protocolVerification/sandboxPresentationPossession.server.ts
// Verifies Passport-format possession signatures against the public key bound in the sandbox
// test credential at prepare time. This is a presentation-protocol simulation, not wallet control.

import type { SandboxPresentationCommitRecord } from "@/lib/auth/ephemeralWallet/sandboxPresentationCommitStore";
import {
  InMemoryPassportPossessionChallengeStore,
  verifyPassportPossessionProof,
  type HolderPossessionProof,
  type PassportPossessionChallengePayload,
} from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import { EPHEMERAL_SANDBOX_TEST_PARTNER_ID } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";

export type SandboxPresentationPossessionVerificationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "presentation_possession_not_prepared"
        | "presentation_possession_already_authorized"
        | "presentation_possession_challenge_missing"
        | "credential_holder_mismatch"
        | string;
    };

export function verifySandboxPresentationPossessionAuthorization(input: {
  commit: SandboxPresentationCommitRecord;
  credential: SignedPassportReusableCredential;
  challenge: PassportPossessionChallengePayload;
  proof: HolderPossessionProof;
  now?: Date;
}): SandboxPresentationPossessionVerificationResult {
  if (input.commit.possession_authorized_at) {
    return { ok: false, code: "presentation_possession_already_authorized" };
  }
  const storedChallenge = input.commit.possession_challenge;
  if (!storedChallenge) {
    return { ok: false, code: "presentation_possession_challenge_missing" };
  }

  const store = new InMemoryPassportPossessionChallengeStore();
  store.issue({
    challenge_id: storedChallenge.challenge_id,
    credential_id: storedChallenge.credential_id,
    partner_id: storedChallenge.partner_id,
    policy_id: storedChallenge.policy_id,
    nonce: storedChallenge.nonce,
    issued_at: storedChallenge.issued_at,
    expires_at: storedChallenge.expires_at,
  });

  const verified = verifyPassportPossessionProof({
    credentialId: input.credential.payload.credential_id,
    partnerId: EPHEMERAL_SANDBOX_TEST_PARTNER_ID,
    policyId: input.commit.policy_id,
    credentialHolderPublicKey: input.credential.payload.holder_possession_public_key,
    challenge: input.challenge,
    proof: input.proof,
    now: input.now,
    store,
  });
  if (!verified.ok) {
    return { ok: false, code: verified.code };
  }
  return { ok: true };
}
