// FILE: lib/passport/reusableCredential/build568.authorizationAtomicity.test.ts

import { describe, expect, it, afterEach } from "vitest";
import nacl from "tweetnacl";
import { openPortableRevocationCheckpointStore, PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV } from "./portableRevocationRuntime";
import { requireIssuerBackedReceiptSigningKey } from "./issuerBackedReceiptSigning";
import { resolvePresentationPartnerPolicy } from "./institutionalPresentationPolicy";
import { prepareSovereignReusableCredentialIssuance } from "./sovereignIssuance";
import { BUILD_566_PARTNER_A, BUILD_566_POLICY_ID, build566TrustEnv } from "./fixtures";
import { PASSPORT_INSTITUTIONAL_SANDBOX_FIXTURES_ENV } from "./institutionalSandboxFixtures";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { PRODUCT_ELIGIBILITY_OVER_21 } from "@/lib/idv/ageEligibility";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "./credentialIssuerRegistry";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "./passportCredentialSigning";
import { BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";

describe("Build #568 authorization atomicity and trust boundaries", () => {
  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_")) delete process.env[key];
    }
  });

  it("forbids in-memory revocation checkpoints in production runtime", async () => {
    process.env[PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV] = "1";
    process.env.NODE_ENV = "production";
    const opened = await openPortableRevocationCheckpointStore(process.env as Record<string, string>);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.code).toBe("checkpoint_memory_forbidden_in_production");
  });

  it("requires configured receipt signing key for issuer-backed authorization", () => {
    delete process.env.ABRAXAS_SIGNING_KEY;
    const key = requireIssuerBackedReceiptSigningKey();
    expect(key.ok).toBe(false);
  });

  it("rejects sandbox fixture partners for genuine issuer-backed credentials", async () => {
    process.env[PASSPORT_INSTITUTIONAL_SANDBOX_FIXTURES_ENV] = "1";
    const issuerKey = generateTestSigningKeyPair("build568-genuine");
    const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 31)));
    const env = {
      ...build566TrustEnv(),
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE: "1",
      ABRAXAS_SIGNING_KEY: JSON.stringify(BUILD_546_PRIMARY_KEY.privateKeyJwk),
      [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([
        credentialIssuerRegistryFromKeyPair({
          issuerId: CLAIM_ISSUERS.abraxas,
          key: issuerKey,
          revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
          snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
        }),
      ]),
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ENV]: JSON.stringify(issuerKey.privateKeyJwk),
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV]: issuerKey.signingKeyId,
    };
    Object.assign(process.env, env);
    const prepared = prepareSovereignReusableCredentialIssuance(
      {
        subjectKey: "abx_hs_56800000000000000000000000000099",
        credentialJti: "urn:uuid:56800000-0000-4000-8000-000000000099",
        claims: [
          {
            subject_id: "abx_hs_56800000000000000000000000000099",
            credential_jti: "urn:uuid:56800000-0000-4000-8000-000000000099",
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
          },
        ],
        assuranceLevel: "L2",
        idvMethod: "manual_review",
        evidenceReferenceHash: "evidence-568",
        expiresAtIso: "2027-06-01T12:00:00.000Z",
        issuedAtIso: "2026-06-01T12:00:00.000Z",
        eventSource: "build568_atomicity_test",
      },
      { env, holderPossessionPublicKey: Buffer.from(holderKeys.publicKey).toString("base64url") },
    );
    if (!prepared.ok) {
      throw new Error(`prepare_failed:${prepared.code}`);
    }
    const resolved = await resolvePresentationPartnerPolicy({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      credential: prepared.credential,
      env: env as Record<string, string>,
    });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.code).toBe("unknown_partner_or_policy");
  });
});
