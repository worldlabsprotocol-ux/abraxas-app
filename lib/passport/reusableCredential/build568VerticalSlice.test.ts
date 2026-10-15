// FILE: lib/passport/reusableCredential/build568VerticalSlice.test.ts

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
import { build566RevocationSnapshotForCredential } from "./fixtures";
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
import { resolveReusableCredentialLifecycle } from "./credentialLifecycle";

describe("Build #568 sovereign passport activation vertical slice", () => {
  let env: Record<string, string>;
  const issuerKey = generateTestSigningKeyPair("build568-slice");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 12)));

  beforeEach(() => {
    resetPassportPossessionChallengeStoreForTests();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_")) delete process.env[key];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE = "1";
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
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE: "1",
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ENV]: JSON.stringify(issuerKey.privateKeyJwk),
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV]: issuerKey.signingKeyId,
      [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([registryEntry]),
    };
    Object.assign(process.env, env);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_")) delete process.env[key];
    }
  });

  it("two independent RPs authorize with one reusable credential without re-IDV", async () => {
    const subjectKey = "abx_hs_56800000000000000000000000000002";
    const credentialJti = "urn:uuid:56800000-0000-4000-8000-000000000002";
    const claim = {
      subject_id: subjectKey,
      credential_jti: credentialJti,
      claim_type: "product_eligibility" as const,
      claim_value: { outcome: PRODUCT_ELIGIBILITY_OVER_21 },
      issuer_id: CLAIM_ISSUERS.abraxas,
      assurance_level: "L2" as const,
      issued_at: "2026-06-01T12:00:00.000Z",
      expires_at: "2027-06-01T12:00:00.000Z",
      revocation_reference: null,
      evidence_reference: "manual_review:568",
      jurisdiction: null,
      policy_scope: "compliance",
    };

    const lifecycleBefore = resolveReusableCredentialLifecycle({
      storageEnabled: true,
      possessionKeyRegistered: true,
      verificationRows: [
        {
          status: "approved",
          identity_verification_status: "approved",
          credential_status: "active",
          credential_jti: credentialJti,
          credential_issued_at: claim.issued_at,
          document_verified: true,
          liveness_passed: true,
          updated_at: claim.issued_at,
        },
      ],
      activeIssuerBackedCredentialCount: 0,
      expiredIssuerBackedCredentialCount: 0,
    });
    expect(lifecycleBefore.state).toBe("approved_preparing_credential");

    const prepared = prepareSovereignReusableCredentialIssuance(
      {
        subjectKey,
        credentialJti,
        claims: [claim],
        assuranceLevel: "L2",
        idvMethod: "manual_review",
        evidenceReferenceHash: "manual_review:568",
        expiresAtIso: claim.expires_at,
        issuedAtIso: claim.issued_at,
        eventSource: "build568_slice",
      },
      {
        env,
        holderPossessionPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url"),
      },
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.credential.payload.provenance.idv_method).toBe("manual_review");

    const lifecycleAfter = resolveReusableCredentialLifecycle({
      storageEnabled: true,
      possessionKeyRegistered: true,
      verificationRows: [],
      activeIssuerBackedCredentialCount: 1,
      expiredIssuerBackedCredentialCount: 0,
    });
    expect(lifecycleAfter.state).toBe("credential_issued");

    const revocationForAuth = build566RevocationSnapshotForCredential(prepared.credential.payload.credential_id);
    const policyRules = { ...BUILD_566_POLICY_RULES, sandbox_only: false };

    async function flow(partnerId: string, requestId: string) {
      resetPassportPossessionChallengeStoreForTests();
      const challenge = issuePassportPossessionChallenge({
        credentialId: prepared.credential.payload.credential_id,
        partnerId,
        policyId: BUILD_566_POLICY_ID,
        now: BUILD_546_FIXTURE_NOW,
      });
      const proof = {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
      };
      const auth = await authorizePartnerFromReusableCredential({
        credential: prepared.credential,
        partnerId,
        policyId: BUILD_566_POLICY_ID,
        policyVersion: 1,
        policyRules,
        requestId,
        receiptSigningKey: BUILD_566_RECEIPT_SIGNING_KEY,
        portableRevocationSnapshot: revocationForAuth,
        possessionChallenge: challenge,
        holderPossessionProof: proof,
        checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
        bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: revocationForAuth })],
        now: BUILD_546_FIXTURE_NOW,
        env,
      });
      expect(auth.ok).toBe(true);
      if (!auth.ok) throw new Error(auth.code);
      expect(auth.idv_repeated).toBe(false);
      const receiptSnapshot = build566RevocationSnapshotForCredential(auth.receipt.id);
      const verified = await verifyReusableCredentialPartnerReceiptIndependently({
        presentation: auth.presentation,
        portableRevocationSnapshot: receiptSnapshot,
        partnerId,
        policyId: BUILD_566_POLICY_ID,
        env,
        requestId: `${requestId}_verify`,
        now: BUILD_546_FIXTURE_NOW,
      });
      expect(verified.outcome).toBe("granted");
      expect(verified.identity_database_required).toBe(false);
      return auth;
    }

    const a = await flow(BUILD_566_PARTNER_A, "req_568_slice_a");
    const b = await flow(BUILD_566_PARTNER_B, "req_568_slice_b");
    expect(a.receipt.partner_id).not.toBe(b.receipt.partner_id);
    expect(a.receipt.id).not.toBe(b.receipt.id);
  });
});
