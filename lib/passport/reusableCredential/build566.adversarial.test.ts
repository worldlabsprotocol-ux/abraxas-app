// FILE: lib/passport/reusableCredential/build566.adversarial.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import nacl from "tweetnacl";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_UNKNOWN_KEY,
} from "@/lib/institutionalCertification/build546/fixtures";
import { InMemoryPortableRevocationCheckpointStore } from "@/lib/protocol/portableRevocation";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
import { authorizePartnerFromReusableCredential } from "./partnerAuthorization";
import { verifyPassportReusableCredentialStrict } from "./verify";
import { signPassportReusableCredential } from "./sign";
import {
  BUILD_566_PARTNER_A,
  BUILD_566_POLICY_ID,
  BUILD_566_POLICY_RULES,
  BUILD_566_CREDENTIAL_ISSUER_KEY,
  build566RevocationSnapshotForCredential,
  build566SyntheticReusableCredential,
  build566TrustEnv,
} from "./fixtures";
import {
  issuePassportPossessionChallenge,
  resetPassportPossessionChallengeStoreForTests,
  signPassportPossessionChallenge,
} from "./holderPossessionChallenge";
import { BUILD_566_HOLDER_POSSESSION_KEYPAIR, BUILD_566_RECEIPT_SIGNING_KEY } from "./fixtures";
import { authorize566PartnerForTest } from "./testHelpers";
import { materializeAuthenticatedClaimsForPolicy } from "./authenticatedClaims";

describe("Build #566 adversarial credential portability", () => {
  beforeEach(() => {
    resetPassportPossessionChallengeStoreForTests();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    Object.assign(process.env, build566TrustEnv());
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  it("rejects forged eligibility outcome and issuer substitution", async () => {
    const credential = build566SyntheticReusableCredential();
    const badOutcome = materializeAuthenticatedClaimsForPolicy({
      credential: {
        ...credential,
        payload: {
          ...credential.payload,
          asserted_claims: [
            {
              ...credential.payload.asserted_claims[0],
              authenticated_outcome: "over_18",
            },
          ],
        },
      },
      policyRules: BUILD_566_POLICY_RULES,
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(badOutcome.ok).toBe(false);

    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const checkpointStore = new InMemoryPortableRevocationCheckpointStore();
    const strict = await verifyPassportReusableCredentialStrict({
      credential,
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
      portableRevocationSnapshot: revocation,
      checkpointStore,
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
    });
    expect(strict.ok).toBe(true);

    const forgedPayload = {
      ...credential.payload,
      issuer_id: "issuer:substituted",
      credential_id: "pc_forged",
    };
    const forged = signPassportReusableCredential(forgedPayload, BUILD_546_UNKNOWN_KEY);
    const rejectForged = await verifyPassportReusableCredentialStrict({
      credential: forged,
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
      portableRevocationSnapshot: build566RevocationSnapshotForCredential(forged.payload.credential_id),
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
    });
    expect(rejectForged.ok).toBe(false);
  });

  it("rejects expired credential, revoked status, and replayed possession challenge", async () => {
    const credential = build566SyntheticReusableCredential({
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const expired = await verifyPassportReusableCredentialStrict({
      credential,
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
      portableRevocationSnapshot: revocation,
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
    });
    expect(expired.ok).toBe(false);

    const fresh = build566SyntheticReusableCredential();
    const freshRev = build566RevocationSnapshotForCredential(fresh.payload.credential_id);
    const revokedSnapshot = build566RevocationSnapshotForCredential(fresh.payload.credential_id);
    revokedSnapshot.payload.status_entries[0].state = "revoked";

    const revoked = await verifyPassportReusableCredentialStrict({
      credential: fresh,
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
      portableRevocationSnapshot: revokedSnapshot,
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: freshRev })],
    });
    expect(revoked.ok).toBe(false);

    const first = await authorize566PartnerForTest({
      credential: fresh,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_possession_once",
      portableRevocationSnapshot: freshRev,
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
    });
    expect(first.ok).toBe(true);

    const challenge = issuePassportPossessionChallenge({
      credentialId: fresh.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, BUILD_566_HOLDER_POSSESSION_KEYPAIR.secretKey),
    };
    await authorizePartnerFromReusableCredential({
      credential: fresh,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_replay_challenge",
      receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
      portableRevocationSnapshot: freshRev,
      possessionChallenge: challenge,
      holderPossessionProof: proof,
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: freshRev })],
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
    });
    const replay = await authorizePartnerFromReusableCredential({
      credential: fresh,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_replay_challenge_2",
      receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
      portableRevocationSnapshot: freshRev,
      possessionChallenge: challenge,
      holderPossessionProof: proof,
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: freshRev })],
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
    });
    expect(replay.ok).toBe(false);
  });

  it("rejects wrong holder possession key", async () => {
    const credential = build566SyntheticReusableCredential();
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const attackerKey = nacl.sign.keyPair();
    const result = await authorizePartnerFromReusableCredential({
      credential,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_wrong_holder",
      receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
      portableRevocationSnapshot: revocation,
      possessionChallenge: challenge,
      holderPossessionProof: {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, attackerKey.secretKey),
      },
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
      now: BUILD_546_FIXTURE_NOW,
      env: process.env as Record<string, string>,
    });
    expect(result.ok).toBe(false);
  });

  it("credential payload excludes legal name, DOB, and document fields", () => {
    const credential = build566SyntheticReusableCredential();
    const json = JSON.stringify(credential.payload);
    expect(json).not.toMatch(/legal_name|date_of_birth|biometric|passport_scan/i);
    expect(credential.payload.signing_key_id).toBe(BUILD_566_CREDENTIAL_ISSUER_KEY.signingKeyId);
  });
});
