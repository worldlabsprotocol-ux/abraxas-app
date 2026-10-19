// FILE: lib/protocolVerification/ephemeralAuthorizedTestIssuer.ts
// Explicitly labeled sandbox test issuer for developer workspace integration only.

import { createHash } from "crypto";
import { generateTestSigningKeyPair, type ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { SANDBOX_ISSUER_ID } from "@/lib/credentials/sandboxClaims";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import { buildSyntheticPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
  type PassportCredentialIssuerRegistryEntry,
} from "@/lib/passport/reusableCredential/credentialIssuerRegistry";
import { signPassportReusableCredential } from "@/lib/passport/reusableCredential/sign";
import type {
  PassportReusableCredentialPayload,
  SignedPassportReusableCredential,
} from "@/lib/passport/reusableCredential/contract";
import { PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION } from "@/lib/passport/reusableCredential/contract";
import { portableRevocationStatusId } from "@/lib/protocol/portableRevocation/statusId";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import {
  BUILD_546_PRIMARY_KEY,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";

export const EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV =
  "ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER" as const;

export const EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID = SANDBOX_ISSUER_ID;

const TEST_ISSUER_KEY_SEED = "ephemeral-sandbox-authorized-test-issuer-v1";

let cachedTestIssuerKey: ReceiptSigningKeyPair | null = null;

export function isEphemeralSandboxAuthorizedTestIssuerEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return env[EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV] === "1";
}

export function resolveEphemeralSandboxAuthorizedTestIssuerKey(): ReceiptSigningKeyPair {
  if (!cachedTestIssuerKey) {
    cachedTestIssuerKey = generateTestSigningKeyPair(TEST_ISSUER_KEY_SEED);
  }
  return cachedTestIssuerKey;
}

export function ephemeralSandboxTestIssuerRegistryEntry(): PassportCredentialIssuerRegistryEntry {
  const key = resolveEphemeralSandboxAuthorizedTestIssuerKey();
  return credentialIssuerRegistryFromKeyPair({
    issuerId: EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID,
    key,
    revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
    snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
  });
}

export function ephemeralSandboxTestIssuerTrustEnv(): Record<string, string> {
  return {
    ...build546TrustRegistryEnv(),
    [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([ephemeralSandboxTestIssuerRegistryEntry()]),
  };
}

export type EphemeralSandboxAgeTestCredentialVariant =
  | "valid"
  | "expired"
  | "revoked"
  | "tampered"
  | "wrong_holder"
  | "invalid_issuer";

export function buildEphemeralSandboxAgeTestCredential(input: {
  walletAddress: string;
  now?: Date;
  variant?: EphemeralSandboxAgeTestCredentialVariant;
}): {
  credential: SignedPassportReusableCredential;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  sandbox_labeled: true;
  production_trusted: false;
} {
  const variant = input.variant ?? "valid";
  const now = input.now ?? new Date();
  const key = resolveEphemeralSandboxAuthorizedTestIssuerKey();
  const holderSubjectId = subjectPseudonymId(input.walletAddress);
  const credentialId = `pc_esbx_age_${createHash("sha256").update(`${holderSubjectId}:${variant}`, "utf8").digest("hex").slice(0, 16)}`;
  const issuedAt = now.toISOString();
  const expiresAt =
    variant === "expired"
      ? new Date(now.getTime() - 60_000).toISOString()
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const evidenceHash = createHash("sha256").update(`esbx-age-evidence:${variant}`, "utf8").digest("hex");
  const possessionRef = createHash("sha256")
    .update(`possession-ref:${holderSubjectId}`, "utf8")
    .digest("hex")
    .slice(0, 32);

  const issuerId =
    variant === "invalid_issuer" ? "issuer:unknown-external" : EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID;

  const payload: PassportReusableCredentialPayload = {
    credential_id: credentialId,
    schema_version: PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION,
    issuer_id: issuerId,
    signing_key_id: key.signingKeyId,
    holder_subject_id: variant === "wrong_holder" ? "abx_hs_wrong_holder_subject_id00001" : holderSubjectId,
    holder_possession_public_key: Buffer.alloc(32, 0).toString("base64url"),
    holder_possession_ref: possessionRef,
    assurance_level: "L2",
    provenance: {
      idv_method: "sandbox_fixture",
      evidence_reference_hash: evidenceHash,
      wallet_ownership_not_sufficient: true,
    },
    asserted_claims: [
      {
        claim_id: `claim-esbx-age-${credentialId}`,
        claim_type: "identity_verified",
        authenticated_outcome: "age_eligible_21",
        authentication_method: "issuer_signed_assertion",
        claim_evidence_ref: evidenceHash,
        issuer_id: issuerId,
        assurance_level: "L2",
        issued_at: issuedAt,
        expires_at: expiresAt,
        status: variant === "revoked" ? "revoked" : "active",
      },
    ],
    issued_at: issuedAt,
    expires_at: expiresAt,
    revocation_status_id: portableRevocationStatusId(credentialId, PORTABLE_REVOCATION_TEST_ISSUER_ID),
    custody_note: "credential_export_not_account_recovery",
  };

  let credential = signPassportReusableCredential(payload, key);
  if (variant === "tampered") {
    credential = {
      ...credential,
      payload: {
        ...credential.payload,
        asserted_claims: [
          {
            ...credential.payload.asserted_claims[0]!,
            authenticated_outcome: "under_21",
          },
        ],
      },
    };
  }

  const revocationState = variant === "revoked" ? "revoked" : "active";
  const portable_revocation_snapshot = buildSyntheticPortableRevocationSnapshot({
    receiptId: credentialId,
    state: revocationState,
    issuedAt,
    expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return {
    credential,
    portable_revocation_snapshot,
    sandbox_labeled: true,
    production_trusted: false,
  };
}

export function isProductionAgeIssuerConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  const raw = env[PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]?.trim();
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Array<{ issuer_id?: string }>;
    if (!Array.isArray(parsed)) return false;
    return parsed.some(
      (row) =>
        row.issuer_id
        && row.issuer_id !== EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ID
        && !row.issuer_id.includes("sandbox"),
    );
  } catch {
    return false;
  }
}
