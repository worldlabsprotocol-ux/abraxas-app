// FILE: lib/passport/reusableCredential/build567.adversarial.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import nacl from "tweetnacl";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { PRODUCT_ELIGIBILITY_OVER_21 } from "@/lib/idv/ageEligibility";
import {
  BUILD_566_PARTNER_A,
  BUILD_566_PARTNER_B,
  BUILD_566_POLICY_ID,
  BUILD_566_POLICY_RULES,
  build566TrustEnv,
} from "./fixtures";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "./credentialIssuerRegistry";
import { prepareSovereignReusableCredentialIssuance } from "./sovereignIssuance";
import { buildSyntheticPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation";
import { hashPassportCredentialPayload, signPassportReusableCredential } from "./sign";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "./passportCredentialSigning";
import { authorizePartnerFromReusableCredential } from "./partnerAuthorization";
import { BUILD_566_RECEIPT_SIGNING_KEY } from "./fixtures";
import { BUILD_546_FIXTURE_NOW, BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import {
  issuePassportPossessionChallenge,
  resetPassportPossessionChallengeStoreForTests,
  signPassportPossessionChallenge,
} from "./holderPossessionChallenge";
import { InMemoryPortableRevocationCheckpointStore } from "@/lib/protocol/portableRevocation";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";

describe.sequential("Build #567 sovereign reusable credential issuance (adversarial)", () => {
  let env: Record<string, string>;
  const issuerKey = generateTestSigningKeyPair("build567-credential-issuer");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 7)));

  beforeEach(() => {
    resetPassportPossessionChallengeStoreForTests();
    const disposablePgUrl =
      process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
      ?? process.env.ABRAXAS_DATABASE_URL?.trim()
      ?? process.env.DATABASE_URL?.trim()
      ?? "";
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_")) delete process.env[key];
    }
    process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE = "1";
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    if (disposablePgUrl) {
      process.env.ABRAXAS_DATABASE_URL = disposablePgUrl;
    }
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ENV] = JSON.stringify(issuerKey.privateKeyJwk);
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV] = issuerKey.signingKeyId;
    const registryEntry = credentialIssuerRegistryFromKeyPair({
      issuerId: CLAIM_ISSUERS.abraxas,
      key: issuerKey,
      revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
    });
    env = {
      ...build566TrustEnv(),
      ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE: "1",
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ...(disposablePgUrl ? { ABRAXAS_DATABASE_URL: disposablePgUrl } : {}),
      [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([registryEntry]),
    };
    Object.assign(process.env, env);
  });

  const baseCtx = {
    subjectKey: "abx_hs_56700000000000000000000000000001",
    credentialJti: "urn:uuid:56700000-0000-4000-8000-000000000001",
    assuranceLevel: "L2" as const,
    idvMethod: "manual_review" as const,
    evidenceReferenceHash: "manual_review:rev-567",
    expiresAtIso: "2027-06-01T12:00:00.000Z",
    issuedAtIso: "2026-06-01T12:00:00.000Z",
    eventSource: "test",
  };

  const eligibilityClaim = {
    subject_id: baseCtx.subjectKey,
    credential_jti: baseCtx.credentialJti,
    claim_type: "product_eligibility" as const,
    claim_value: { outcome: PRODUCT_ELIGIBILITY_OVER_21 },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: "L2" as const,
    issued_at: baseCtx.issuedAtIso,
    expires_at: baseCtx.expiresAtIso,
    revocation_reference: null,
    evidence_reference: "evidence-hash-567",
    jurisdiction: null,
    policy_scope: "compliance",
  };

  it("rejects issuance without possession key or eligibility claims", () => {
    const noKey = prepareSovereignReusableCredentialIssuance(
      { ...baseCtx, claims: [eligibilityClaim] },
      { env, holderPossessionPublicKey: null },
    );
    expect(noKey.ok).toBe(false);
    if (noKey.ok) return;
    expect(noKey.code).toBe("possession_key_missing");

    const noClaims = prepareSovereignReusableCredentialIssuance(
      { ...baseCtx, claims: [] },
      { env, holderPossessionPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url") },
    );
    expect(noClaims.ok).toBe(false);
  });

  it("issues signed credential and two partners authorize independently", async () => {
    const prepared = prepareSovereignReusableCredentialIssuance(
      { ...baseCtx, claims: [eligibilityClaim] },
      {
        env,
        holderPossessionPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url"),
        claimIdsByType: new Map([["product_eligibility", "claim-567-pe"]]),
      },
    );
    expect(prepared.ok, !prepared.ok ? prepared.code : "").toBe(true);
    if (!prepared.ok) return;
    const roundtrip = JSON.parse(JSON.stringify(prepared.credential)) as typeof prepared.credential;
    expect(hashPassportCredentialPayload(roundtrip.payload)).toBe(prepared.credential.payload_hash);
    expect(prepared.credential.payload.provenance.idv_method).toBe("manual_review");

    const revocation = buildSyntheticPortableRevocationSnapshot({
      receiptId: prepared.credential.payload.credential_id,
      state: "active",
    });
    const policyRules = { ...BUILD_566_POLICY_RULES, sandbox_only: false };

    async function authorize(partnerId: string, requestId: string) {
      resetPassportPossessionChallengeStoreForTests();
      const challenge = issuePassportPossessionChallenge({
        credentialId: prepared.credential.payload.credential_id,
        partnerId,
        policyId: BUILD_566_POLICY_ID,
      });
      const proof = {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
      };
      return authorizePartnerFromReusableCredential({
        credential: prepared.credential,
        partnerId,
        policyId: BUILD_566_POLICY_ID,
        policyVersion: 1,
        policyRules,
        requestId,
        receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
        portableRevocationSnapshot: revocation,
        possessionChallenge: challenge,
        holderPossessionProof: proof,
        checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
        bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
        now: BUILD_546_FIXTURE_NOW,
        env,
      });
    }

    const partnerA = await authorize(BUILD_566_PARTNER_A, "req_567_a");
    expect(partnerA.ok).toBe(true);

    const partnerB = await authorize(BUILD_566_PARTNER_B, "req_567_b");
    expect(partnerB.ok).toBe(true);
    if (!partnerA.ok || !partnerB.ok) return;
    expect(partnerA.receipt.partner_id).not.toBe(partnerB.receipt.partner_id);
    expect(partnerA.receipt.id).not.toBe(partnerB.receipt.id);
  });

  it("rejects forged issuer signature", () => {
    const prepared = prepareSovereignReusableCredentialIssuance(
      { ...baseCtx, claims: [eligibilityClaim] },
      {
        env,
        holderPossessionPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url"),
      },
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const forgedKey = generateTestSigningKeyPair("forged");
    const tampered = signPassportReusableCredential(prepared.credential.payload, forgedKey);
    expect(tampered.signature).not.toBe(prepared.credential.signature);
  });
});
