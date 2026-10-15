// FILE: lib/passport/reusableCredential/build568.security.test.ts

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
import { signPassportReusableCredential } from "./sign";
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
import { verifyReusableCredentialPartnerReceiptIndependently } from "./independentReceiptVerification";
import { resolveInstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";

describe("Build #568 reusable passport security regressions", () => {
  let env: Record<string, string>;
  const issuerKey = generateTestSigningKeyPair("build568-issuer");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 8)));
  const wrongHolder = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 9)));

  beforeEach(() => {
    resetPassportPossessionChallengeStoreForTests();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_")) delete process.env[key];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE = "1";
    const registryEntry = credentialIssuerRegistryFromKeyPair({
      issuerId: CLAIM_ISSUERS.abraxas,
      key: issuerKey,
      revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
    });
    env = {
      ...build566TrustEnv(),
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE: "1",
      [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([registryEntry]),
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ENV]: JSON.stringify(issuerKey.privateKeyJwk),
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV]: issuerKey.signingKeyId,
    };
    Object.assign(process.env, env);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_")) delete process.env[key];
    }
  });

  const eligibilityClaim = {
    subject_id: "abx_hs_56800000000000000000000000000001",
    credential_jti: "urn:uuid:56800000-0000-4000-8000-000000000001",
    claim_type: "product_eligibility" as const,
    claim_value: { outcome: PRODUCT_ELIGIBILITY_OVER_21 },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: "L2" as const,
    issued_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
    revocation_reference: null,
    evidence_reference: "evidence-568",
    jurisdiction: null,
    policy_scope: "compliance",
  };

  function issuedCredential() {
    const prepared = prepareSovereignReusableCredentialIssuance(
      {
        subjectKey: eligibilityClaim.subject_id,
        credentialJti: eligibilityClaim.credential_jti!,
        claims: [eligibilityClaim],
        assuranceLevel: "L2",
        idvMethod: "manual_review",
        evidenceReferenceHash: "evidence-568",
        expiresAtIso: eligibilityClaim.expires_at!,
        issuedAtIso: eligibilityClaim.issued_at,
        eventSource: "build568_test",
      },
      {
        env,
        holderPossessionPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url"),
      },
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("prepare");
    return prepared.credential;
  }

  it("rejects unknown partner and policy pairs for consent catalog", async () => {
    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: "attacker-partner",
      policyId: BUILD_566_POLICY_ID,
    });
    expect(entry).toBeNull();
  });

  it("rejects possession signature substitution", async () => {
    const credential = issuedCredential();
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      now: BUILD_546_FIXTURE_NOW,
    });
    const wrongProof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, wrongHolder.secretKey),
    };
    const revocation = buildSyntheticPortableRevocationSnapshot({
      receiptId: credential.payload.credential_id,
      state: "active",
    });
    const auth = await authorizePartnerFromReusableCredential({
      credential,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      policyRules: { ...BUILD_566_POLICY_RULES, sandbox_only: false },
      requestId: "req_568_wrong_possession",
      receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
      portableRevocationSnapshot: revocation,
      possessionChallenge: challenge,
      holderPossessionProof: wrongProof,
      checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocation })],
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(auth.ok).toBe(false);
  });

  it("blocks cross institution receipt reuse at independent verification", async () => {
    const credential = issuedCredential();
    const revocation = buildSyntheticPortableRevocationSnapshot({
      receiptId: credential.payload.credential_id,
      state: "active",
    });
    const policyRules = { ...BUILD_566_POLICY_RULES, sandbox_only: false };

    async function authorize(partnerId: string, requestId: string) {
      resetPassportPossessionChallengeStoreForTests();
      const challenge = issuePassportPossessionChallenge({
        credentialId: credential.payload.credential_id,
        partnerId,
        policyId: BUILD_566_POLICY_ID,
        now: BUILD_546_FIXTURE_NOW,
      });
      const proof = {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
      };
      return authorizePartnerFromReusableCredential({
        credential,
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

    const partnerA = await authorize(BUILD_566_PARTNER_A, "req_568_a");
    expect(partnerA.ok).toBe(true);
    if (!partnerA.ok) return;

    const wrongPartnerVerify = await verifyReusableCredentialPartnerReceiptIndependently({
      presentation: partnerA.presentation,
      portableRevocationSnapshot: revocation,
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_566_POLICY_ID,
      env,
      requestId: "req_568_b_verify",
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(wrongPartnerVerify.outcome).not.toBe("granted");
  });

  it("rejects forged issuer signature", () => {
    const credential = issuedCredential();
    const forgedKey = generateTestSigningKeyPair("forged-568");
    const tampered = signPassportReusableCredential(credential.payload, forgedKey);
    expect(tampered.signature).not.toBe(credential.signature);
  });
});
