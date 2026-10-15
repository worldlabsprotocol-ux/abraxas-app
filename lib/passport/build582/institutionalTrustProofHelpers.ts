// FILE: lib/passport/build582/institutionalTrustProofHelpers.ts
// Shared disposable-PG institutional trust proof (Build #582 / extends Build #569).

import { randomBytes } from "node:crypto";
import nacl from "tweetnacl";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import { BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { insertInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";
import { insertPassportPossessionChallengeDirect } from "@/lib/persistence/postgresPassportPossessionChallengeStore";
import {
  listPassportReusableCredentialsForHolderDirect,
  tryBackfillPassportReusableCredentialForSubjectDirect,
  upsertPassportHolderPossessionKeyDirect,
} from "@/lib/persistence/passportReusableCredentialDirectStore";
import {
  BUILD_566_PARTNER_A,
  BUILD_566_PARTNER_B,
  BUILD_566_POLICY_ID,
  buildFreshPortableRevocationSnapshotForCredential,
  buildFreshPortableRevocationSnapshotForReceiptIds,
} from "@/lib/passport/reusableCredential/fixtures";
import { authorizeIssuerBackedPresentation } from "@/lib/passport/reusableCredential/issuerBackedPresentationOrchestration";
import { hashInstitutionalConsentBinding } from "@/lib/passport/reusableCredential/institutionalConsentBinding";
import {
  issuePassportPossessionChallenge,
  signPassportPossessionChallenge,
} from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import { resolveInstitutionalPartnerCatalogEntry } from "@/lib/passport/reusableCredential/institutionalPartnerCatalog";
import type { PassportInstitutionalVerificationBundle } from "@/lib/passport/reusableCredential/independentPassportVerifier";
import { BUILD_568_PARTNER_B_POLICY_ID } from "@/lib/passport/reusableCredential/testInstitutionalPolicySeed";
import {
  build569IndependentInstitutionConfig,
  build569PortableRevocationIssuerTrustJson,
} from "@/lib/passport/reusableCredential/build569IndependentInstitutionTestHelpers";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "@/lib/passport/reusableCredential/credentialIssuerRegistry";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "@/lib/passport/reusableCredential/passportCredentialSigning";
import { PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV } from "@/lib/passport/reusableCredential/portableRevocationRuntime";
import { PORTABLE_REVOCATION_ISSUER_TRUST_ENV } from "@/lib/passport/reusableCredential/independentInstitutionConfig";
import { build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";

export const BUILD_582_CREDENTIAL_KEY = generateTestSigningKeyPair("passport-credential-582-trust");

/** Test-only publisher responses keyed by portable revocation status id. */
export const build582PublisherSnapshotsByStatusId = new Map<string, PortableRevocationSignedArtifact>();

export function resetBuild582PublisherSnapshotsForTests(): void {
  build582PublisherSnapshotsByStatusId.clear();
}

export function resolveBuild582PublisherSnapshot(statusId: string): PortableRevocationSignedArtifact | null {
  return build582PublisherSnapshotsByStatusId.get(statusId) ?? null;
}

export function build582TrustEnvBase(): Record<string, string> {
  const registryEntry = credentialIssuerRegistryFromKeyPair({
    issuerId: CLAIM_ISSUERS.abraxas,
    key: BUILD_582_CREDENTIAL_KEY,
    revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
    snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
  });
  return {
    ...build546TrustRegistryEnv(),
    [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([registryEntry]),
    [PORTABLE_REVOCATION_ISSUER_TRUST_ENV]: build569PortableRevocationIssuerTrustJson(BUILD_582_CREDENTIAL_KEY),
  };
}

export async function build582SyntheticApprovedHolder(input?: {
  holderSeed?: number;
}): Promise<{ holderSubjectId: string; credential: SignedPassportReusableCredential; holderKeys: nacl.SignKeyPair }> {
  const holderKeys = nacl.sign.keyPair.fromSeed(
    Uint8Array.from(Buffer.alloc(32, input?.holderSeed ?? 82)),
  );
  const wallet = await resolveSubjectForVerifiedWalletDirect({
    caip: caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`),
    authMethod: "evm_wallet",
  });
  if (!wallet.ok) throw new Error("wallet");
  await upsertPassportHolderPossessionKeyDirect({
    holderSubjectId: wallet.subjectId,
    publicKeyB64Url: Buffer.from(holderKeys.publicKey).toString("base64url"),
  });
  const issued = await issueManualIdentityCredential(wallet.subjectId, {
    reviewId: `rev_${randomBytes(6).toString("hex")}`,
    jurisdiction: "US-MO",
    documentType: "passport",
    documentDateOfBirth: "1990-01-01",
    minimumAgeGate: 21,
    eligibilityEvidenceReference: `manual_review:build582-${randomBytes(4).toString("hex")}`,
  });
  if (!issued.ok) throw new Error("idv");
  await tryBackfillPassportReusableCredentialForSubjectDirect({
    subjectKey: wallet.subjectId,
    eventSource: "build582_institutional_trust_proof",
  });
  const creds = await listPassportReusableCredentialsForHolderDirect(wallet.subjectId);
  const credential = creds[0];
  if (!credential) throw new Error("credential");
  build582PublisherSnapshotsByStatusId.set(
    credential.payload.revocation_status_id,
    buildFreshPortableRevocationSnapshotForCredential(credential.payload.credential_id),
  );
  return { holderSubjectId: wallet.subjectId, credential, holderKeys };
}

export async function build582AuthorizePresentation(input: {
  holderSubjectId: string;
  credential: SignedPassportReusableCredential;
  holderKeys: nacl.SignKeyPair;
  partnerId: string;
  policyId: string;
  requestId: string;
  receiptSigningKey?: typeof BUILD_546_PRIMARY_KEY;
}): Promise<{
  bundle: PassportInstitutionalVerificationBundle;
  institution: ReturnType<typeof build569IndependentInstitutionConfig>;
  receiptId: string;
  consentId: string;
}> {
  const entry = await resolveInstitutionalPartnerCatalogEntry({
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  if (!entry) throw new Error("catalog");
  const hash = hashInstitutionalConsentBinding({
    holder_subject_id: input.holderSubjectId,
    credential_id: input.credential.payload.credential_id,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: entry.policy_version,
    requested_attribute: entry.requested_attribute,
  });
  const consent = await insertInstitutionalPresentationConsentDirect({
    holderSubjectId: input.holderSubjectId,
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: entry.policy_version,
    disclosureHash: hash,
  });
  if (!consent.ok) throw new Error(consent.code);
  const challenge = issuePassportPossessionChallenge({
    credentialId: input.credential.payload.credential_id,
    partnerId: input.partnerId,
    policyId: input.policyId,
  });
  await insertPassportPossessionChallengeDirect(challenge);
  const snapshot = build582PublisherSnapshotsByStatusId.get(input.credential.payload.revocation_status_id)
    ?? buildFreshPortableRevocationSnapshotForCredential(input.credential.payload.credential_id);
  build582PublisherSnapshotsByStatusId.set(input.credential.payload.revocation_status_id, snapshot);
  process.env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
    bootstrapTrustFromArtifact({ artifact: snapshot }),
  ]);
  process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL = "https://publisher.test";
  const auth = await authorizeIssuerBackedPresentation({
    credential: input.credential,
    holderSubjectId: input.holderSubjectId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    consentId: consent.consentId,
    requestId: input.requestId,
    challenge,
    holderPossessionProof: {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, input.holderKeys.secretKey),
    },
    receiptSigningKey: input.receiptSigningKey ?? BUILD_546_PRIMARY_KEY,
  });
  if (!auth.ok) throw new Error("code" in auth ? auth.code : "auth");
  const verifySnapshot = buildFreshPortableRevocationSnapshotForReceiptIds([
    input.credential.payload.credential_id,
    auth.authorized.receipt.id,
  ]);
  build582PublisherSnapshotsByStatusId.set(
    input.credential.payload.revocation_status_id,
    verifySnapshot,
  );
  const bundle: PassportInstitutionalVerificationBundle = {
    credential: input.credential,
    presentation: auth.authorized.presentation,
    portable_revocation_snapshot: verifySnapshot,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    request_id: input.requestId,
  };
  const institution = build569IndependentInstitutionConfig({
    partnerId: input.partnerId,
    policyId: input.policyId,
    trustEnv: build582TrustEnvBase(),
    trustedBootstrapSnapshot: verifySnapshot,
  });
  return {
    bundle,
    institution,
    receiptId: auth.authorized.receipt.id,
    consentId: consent.consentId,
  };
}

export const BUILD_582_TENANT_A = { partnerId: BUILD_566_PARTNER_A, policyId: BUILD_566_POLICY_ID };
export const BUILD_582_TENANT_B = { partnerId: BUILD_566_PARTNER_B, policyId: BUILD_568_PARTNER_B_POLICY_ID };
