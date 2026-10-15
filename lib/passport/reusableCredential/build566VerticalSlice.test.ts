// FILE: lib/passport/reusableCredential/build566VerticalSlice.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PRIMARY_KEY,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import {
  createProofFirstPortableRevocationTestContext,
  rpWithSnapshotBootstrap,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import {
  authorizePartnerFromReusableCredential,
  resetPartnerAuthorizationReplayLedgerForTests,
} from "./partnerAuthorization";
import {
  BUILD_566_HOLDER_SUBJECT,
  BUILD_566_PARTNER_A,
  BUILD_566_PARTNER_B,
  BUILD_566_POLICY_ID,
  BUILD_566_POLICY_RULES,
  build566RevocationSnapshotForCredential,
  build566SyntheticReusableCredential,
} from "./fixtures";

describe("Build #566 universal credential portability", () => {
  let env: Record<string, string>;

  beforeEach(() => {
    resetPartnerAuthorizationReplayLedgerForTests();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  it("one issued credential → two independent partners authorize without repeat IDV", async () => {
    const credential = build566SyntheticReusableCredential();
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const portableCtx = createProofFirstPortableRevocationTestContext();

    const partnerA = await authorizePartnerFromReusableCredential({
      credential,
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_566_partner_a",
      signingKey: BUILD_546_PRIMARY_KEY,
      trustedCredentialIssuerIds: [credential.payload.issuer_id],
      portableRevocationSnapshot: revocation,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(partnerA.ok).toBe(true);
    if (!partnerA.ok) return;
    expect(partnerA.idv_repeated).toBe(false);

    const partnerB = await authorizePartnerFromReusableCredential({
      credential,
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_566_partner_b",
      signingKey: BUILD_546_PRIMARY_KEY,
      trustedCredentialIssuerIds: [credential.payload.issuer_id],
      portableRevocationSnapshot: revocation,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(partnerB.ok).toBe(true);
    if (!partnerB.ok) return;

    expect(partnerA.receipt.partner_id).toBe(BUILD_566_PARTNER_A);
    expect(partnerB.receipt.partner_id).toBe(BUILD_566_PARTNER_B);
    expect(partnerA.receipt.id).not.toBe(partnerB.receipt.id);

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

  it("partner A receipt cannot authorize partner B (no cross-partner receipt reuse)", async () => {
    const credential = build566SyntheticReusableCredential();
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const portableCtx = createProofFirstPortableRevocationTestContext();

    const partnerA = await authorizePartnerFromReusableCredential({
      credential,
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_566_cross_a",
      signingKey: BUILD_546_PRIMARY_KEY,
      trustedCredentialIssuerIds: [credential.payload.issuer_id],
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
        { partnerId: BUILD_566_PARTNER_B, policyId: BUILD_566_POLICY_ID, env },
        portableCtx,
        snapshot,
      ),
    });
    expect(wrongAudience.outcome).not.toBe("granted");
  });
});
