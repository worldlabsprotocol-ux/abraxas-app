// FILE: lib/passport/reusableCredential/build566VerticalSlice.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import nacl from "tweetnacl";
import { BUILD_546_FIXTURE_NOW } from "@/lib/institutionalCertification/build546/fixtures";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import {
  createProofFirstPortableRevocationTestContext,
  rpWithSnapshotBootstrap,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import {
  BUILD_566_HOLDER_SUBJECT,
  BUILD_566_PARTNER_A,
  BUILD_566_PARTNER_B,
  BUILD_566_POLICY_ID,
  BUILD_566_POLICY_RULES,
  build566RevocationSnapshotForCredential,
  build566SyntheticReusableCredential,
  build566TrustEnv,
} from "./fixtures";
import { authorize566PartnerForTest } from "./testHelpers";
import {
  issuePassportPossessionChallenge,
  resetPassportPossessionChallengeStoreForTests,
  signPassportPossessionChallenge,
} from "./holderPossessionChallenge";
import { BUILD_566_HOLDER_POSSESSION_KEYPAIR } from "./fixtures";

describe("Build #566 universal credential portability", () => {
  let env: Record<string, string>;

  beforeEach(() => {
    resetPassportPossessionChallengeStoreForTests();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    env = build566TrustEnv();
    Object.assign(process.env, env);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  it("one synthetic credential, two partners, distinct possession challenges, no repeat IDV", async () => {
    const credential = build566SyntheticReusableCredential();
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const portableCtx = createProofFirstPortableRevocationTestContext();

    const partnerA = await authorize566PartnerForTest({
      credential,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_566_partner_a",
      portableRevocationSnapshot: revocation,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(partnerA.ok).toBe(true);
    if (!partnerA.ok) return;
    expect(partnerA.decision_context).toBe("sandbox_only");

    const partnerB = await authorize566PartnerForTest({
      credential,
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_566_POLICY_ID,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_566_partner_b",
      portableRevocationSnapshot: revocation,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(partnerB.ok).toBe(true);
    if (!partnerB.ok) return;

    expect(partnerA.receipt.partner_id).toBe(BUILD_566_PARTNER_A);
    expect(partnerB.receipt.partner_id).toBe(BUILD_566_PARTNER_B);
    expect(partnerA.receipt.signing_key_id).not.toBe(credential.payload.signing_key_id);

    const snapshotA = build566RevocationSnapshotForCredential(partnerA.receipt.id);
    const decisionA = await verifyHolderPresentationAtRelyingParty({
      presentation: partnerA.presentation,
      requestId: "rp_verify_a",
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshotA,
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_566_PARTNER_A, policyId: BUILD_566_POLICY_ID, env, allowSandbox: true },
        portableCtx,
        snapshotA,
      ),
    });
    expect(decisionA.outcome).toBe("granted");

    const snapshotB = build566RevocationSnapshotForCredential(partnerB.receipt.id);
    const portableCtxB = createProofFirstPortableRevocationTestContext();
    const decisionB = await verifyHolderPresentationAtRelyingParty({
      presentation: partnerB.presentation,
      requestId: "rp_verify_b",
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshotB,
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_566_PARTNER_B, policyId: BUILD_566_POLICY_ID, env, allowSandbox: true },
        portableCtxB,
        snapshotB,
      ),
    });
    expect(decisionB.outcome).toBe("granted");
  });

  it("partner A receipt cannot authorize partner B", async () => {
    const credential = build566SyntheticReusableCredential();
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const portableCtx = createProofFirstPortableRevocationTestContext();

    const partnerA = await authorize566PartnerForTest({
      credential,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_566_cross_a",
      portableRevocationSnapshot: revocation,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(partnerA.ok).toBe(true);
    if (!partnerA.ok) return;

    const snapshot = build566RevocationSnapshotForCredential(partnerA.receipt.id);
    const wrongAudience = await verifyHolderPresentationAtRelyingParty({
      presentation: partnerA.presentation,
      requestId: "rp_verify_wrong_audience",
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_566_PARTNER_B, policyId: BUILD_566_POLICY_ID, env, allowSandbox: true },
        portableCtx,
        snapshot,
      ),
    });
    expect(wrongAudience.outcome).not.toBe("granted");
  });

  it("rejects client supplied subject without possession signature", async () => {
    const credential = build566SyntheticReusableCredential({
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
    });
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const wrongKey = nacl.sign.keyPair();
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, wrongKey.secretKey),
    };
    const { authorizePartnerFromReusableCredential } = await import("./partnerAuthorization");
    const { InMemoryPortableRevocationCheckpointStore } = await import("@/lib/protocol/portableRevocation");
    const { bootstrapTrustFromArtifact } = await import("@/lib/protocol/portableRevocation");
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const result = await authorizePartnerFromReusableCredential({
      credential,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_wrong_possession",
      receiptSigningKey: (await import("./fixtures")).BUILD_566_RECEIPT_SIGNING_KEY,
      portableRevocationSnapshot: revocation,
      possessionChallenge: challenge,
      holderPossessionProof: proof,
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toMatch(/possession/);
  });
});
