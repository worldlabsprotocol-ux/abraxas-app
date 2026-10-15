// FILE: lib/passport/reusableCredential/build566.adversarial.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PRIMARY_KEY,
  BUILD_546_UNKNOWN_KEY,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import {
  authorizePartnerFromReusableCredential,
  resetPartnerAuthorizationReplayLedgerForTests,
} from "./partnerAuthorization";
import { verifyPassportReusableCredential } from "./verify";
import { signPassportReusableCredential } from "./sign";
import {
  BUILD_566_HOLDER_SUBJECT,
  BUILD_566_PARTNER_A,
  BUILD_566_POLICY_ID,
  BUILD_566_POLICY_RULES,
  build566RevocationSnapshotForCredential,
  build566SyntheticReusableCredential,
} from "./fixtures";

describe("Build #566 adversarial credential portability", () => {
  beforeEach(() => {
    resetPartnerAuthorizationReplayLedgerForTests();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    Object.assign(process.env, build546TrustRegistryEnv());
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  it("rejects unauthorized issuer and forged signatures", () => {
    const credential = build566SyntheticReusableCredential();
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const badIssuer = verifyPassportReusableCredential({
      credential,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedIssuerIds: ["issuer:evil"],
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: revocation,
    });
    expect(badIssuer.ok).toBe(false);

    const tampered = {
      ...credential,
      payload: { ...credential.payload, issuer_id: "issuer:evil" },
    };
    const badSig = verifyPassportReusableCredential({
      credential: tampered,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedIssuerIds: [credential.payload.issuer_id],
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: revocation,
    });
    expect(badSig.ok).toBe(false);
  });

  it("rejects wrong holder, expired credential, and revoked status", async () => {
    const credential = build566SyntheticReusableCredential({
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
    const expired = verifyPassportReusableCredential({
      credential,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedIssuerIds: [credential.payload.issuer_id],
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: revocation,
    });
    expect(expired.ok).toBe(false);

    const fresh = build566SyntheticReusableCredential();
    const revokedSnapshot = build566RevocationSnapshotForCredential(fresh.payload.credential_id);
    revokedSnapshot.payload.status_entries[0].state = "revoked";
    const revoked = verifyPassportReusableCredential({
      credential: fresh,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedIssuerIds: [fresh.payload.issuer_id],
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: revokedSnapshot,
    });
    expect(revoked.ok).toBe(false);

    const wrongHolder = await authorizePartnerFromReusableCredential({
      credential: fresh,
      holderSubjectId: "abx_hs_attacker000000000000000000000001",
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_wrong_holder",
      signingKey: BUILD_546_PRIMARY_KEY,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedCredentialIssuerIds: [fresh.payload.issuer_id],
      portableRevocationSnapshot: build566RevocationSnapshotForCredential(fresh.payload.credential_id),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(wrongHolder.ok).toBe(false);
  });

  it("rejects replayed request_id and credentials signed by unknown key", async () => {
    const credential = build566SyntheticReusableCredential();
    const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);

    const first = await authorizePartnerFromReusableCredential({
      credential,
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_replay_566",
      signingKey: BUILD_546_PRIMARY_KEY,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedCredentialIssuerIds: [credential.payload.issuer_id],
      portableRevocationSnapshot: revocation,
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(first.ok).toBe(true);

    const replay = await authorizePartnerFromReusableCredential({
      credential,
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: BUILD_566_POLICY_RULES,
      requestId: "req_replay_566",
      signingKey: BUILD_546_PRIMARY_KEY,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedCredentialIssuerIds: [credential.payload.issuer_id],
      portableRevocationSnapshot: revocation,
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(replay.ok).toBe(false);

    const forgedPayload = { ...credential.payload, credential_id: "pc_forged" };
    const forged = signPassportReusableCredential(forgedPayload, BUILD_546_UNKNOWN_KEY);
    const rejectForged = verifyPassportReusableCredential({
      credential: forged,
      issuerPublicKeyJwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
      trustedIssuerIds: [forged.payload.issuer_id],
      holderSubjectId: BUILD_566_HOLDER_SUBJECT,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: build566RevocationSnapshotForCredential(forged.payload.credential_id),
    });
    expect(rejectForged.ok).toBe(false);
  });

  it("credential payload excludes legal name, DOB, and document fields", () => {
    const credential = build566SyntheticReusableCredential();
    const json = JSON.stringify(credential.payload);
    expect(json).not.toMatch(/legal_name|date_of_birth|biometric|passport_scan/i);
    expect(credential.payload.asserted_claims.every((c) => !c.claim_value_ref.includes("@"))).toBe(true);
  });
});
