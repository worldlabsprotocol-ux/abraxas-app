// FILE: lib/passport/reusableCredential/fixtures.ts

import { createHash } from "crypto";
import nacl from "tweetnacl";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PRIMARY_KEY,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { PRODUCT_ELIGIBILITY_OVER_21 } from "@/lib/idv/ageEligibility";
import { portableRevocationStatusId } from "@/lib/protocol/portableRevocation/statusId";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import { buildSyntheticPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation";
import { buildPortableRevocationPayload, signPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation/sign";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import {
  PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION,
  type PassportReusableCredentialPayload,
  type SignedPassportReusableCredential,
} from "./contract";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "./credentialIssuerRegistry";
import { signPassportReusableCredential } from "./sign";

export const BUILD_566_HOLDER_SUBJECT = "abx_hs_56600000000000000000000000000001";
export const BUILD_566_PARTNER_A = "institutional-rp-example";
export const BUILD_566_PARTNER_B = "sandbox-partner-beta";
export const BUILD_566_POLICY_ID = "institutional-age-21-v1";
export const BUILD_566_CREDENTIAL_ISSUER = CLAIM_ISSUERS.abraxas;

/** Separate from partner receipt signing keys. */
export const BUILD_566_CREDENTIAL_ISSUER_KEY = generateTestSigningKeyPair("build566-credential-issuer");
export const BUILD_566_RECEIPT_SIGNING_KEY = BUILD_546_PRIMARY_KEY;

const HOLDER_SEED = Uint8Array.from(Buffer.from("build566-holder-possession-seed-01", "utf8")).slice(0, 32);
export const BUILD_566_HOLDER_POSSESSION_KEYPAIR = nacl.sign.keyPair.fromSeed(HOLDER_SEED);

export const BUILD_566_POLICY_RULES: PartnerPolicyRules = {
  sandbox_only: true,
  required_claims: [
    {
      claim_type: "product_eligibility",
      must_equal: PRODUCT_ELIGIBILITY_OVER_21,
      max_age_hours: 8760,
      min_assurance: "L2",
    },
  ],
};

export function build566TrustEnv(): Record<string, string> {
  const registryEntry = credentialIssuerRegistryFromKeyPair({
    issuerId: BUILD_566_CREDENTIAL_ISSUER,
    key: BUILD_566_CREDENTIAL_ISSUER_KEY,
    revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
    snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
  });
  return {
    ...build546TrustRegistryEnv(),
    [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([registryEntry]),
  };
}

export function build566SyntheticReusableCredential(input?: {
  credentialId?: string;
  holderSubjectId?: string;
  expiresAt?: string;
  authenticatedOutcome?: string;
}): SignedPassportReusableCredential {
  const credentialId = input?.credentialId ?? "pc_566_synthetic_eligibility";
  const holderSubjectId = input?.holderSubjectId ?? BUILD_566_HOLDER_SUBJECT;
  const issuedAt = BUILD_546_FIXTURE_NOW.toISOString();
  const expiresAt = input?.expiresAt ?? "2027-06-01T12:00:00.000Z";
  const evidenceHash = createHash("sha256").update("synthetic-idv-evidence-566", "utf8").digest("hex");
  const possessionRef = createHash("sha256")
    .update(`possession-ref:${holderSubjectId}`, "utf8")
    .digest("hex")
    .slice(0, 32);
  const outcome = input?.authenticatedOutcome ?? PRODUCT_ELIGIBILITY_OVER_21;

  const payload: PassportReusableCredentialPayload = {
    credential_id: credentialId,
    schema_version: PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION,
    issuer_id: BUILD_566_CREDENTIAL_ISSUER,
    signing_key_id: BUILD_566_CREDENTIAL_ISSUER_KEY.signingKeyId,
    holder_subject_id: holderSubjectId,
    holder_possession_public_key: Buffer.from(BUILD_566_HOLDER_POSSESSION_KEYPAIR.publicKey).toString("base64url"),
    holder_possession_ref: possessionRef,
    assurance_level: "L2",
    provenance: {
      idv_method: "sandbox_fixture",
      evidence_reference_hash: evidenceHash,
      wallet_ownership_not_sufficient: true,
    },
    asserted_claims: [
      {
        claim_id: "claim-566-product-eligibility",
        claim_type: "product_eligibility",
        authenticated_outcome: outcome,
        authentication_method: "issuer_signed_assertion",
        claim_evidence_ref: evidenceHash,
        issuer_id: BUILD_566_CREDENTIAL_ISSUER,
        assurance_level: "L2",
        issued_at: issuedAt,
        expires_at: expiresAt,
        status: "active",
      },
    ],
    issued_at: issuedAt,
    expires_at: expiresAt,
    revocation_status_id: portableRevocationStatusId(credentialId, PORTABLE_REVOCATION_TEST_ISSUER_ID),
    custody_note: "credential_export_not_account_recovery",
  };

  return signPassportReusableCredential(payload, BUILD_566_CREDENTIAL_ISSUER_KEY);
}

export function build566RevocationSnapshotForCredential(credentialId: string) {
  return buildSyntheticPortableRevocationSnapshot({
    receiptId: credentialId,
    state: "active",
  });
}

/** Portable revocation snapshot with wall-clock freshness for sovereign Postgres tests. */
export function buildFreshPortableRevocationSnapshotForCredential(credentialId: string) {
  return buildFreshPortableRevocationSnapshotForReceiptIds([credentialId]);
}

export function buildFreshPortableRevocationSnapshotForReceiptIds(receiptIds: string[]) {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const primary = receiptIds[0] ?? "receipt_missing";
  const base = buildSyntheticPortableRevocationSnapshot({
    receiptId: primary,
    state: "active",
    issuedAt,
    expiresAt,
  });
  if (receiptIds.length <= 1) return base;
  const payload = buildPortableRevocationPayload({
    issuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
    signingKeyId: BUILD_546_PRIMARY_KEY.signingKeyId,
    snapshotSequence: 1,
    issuedAt,
    expiresAt,
    maxFreshnessSeconds: 86_400,
    previousSnapshotHash: null,
    receiptStates: receiptIds.map((receiptId) => ({
      receiptId,
      state: "active" as const,
      updatedAt: issuedAt,
    })),
  });
  return signPortableRevocationSnapshot({ payload, signingKey: BUILD_546_PRIMARY_KEY });
}
