// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryAttestation.ts
// Server-minted, single-use attestation proving an authenticated native account requested recovery.

import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { isNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import {
  insertRecoveryAttestationRecord,
  consumeRecoveryAttestationRecord,
  type RecoveryAttestationRecord,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestationStore";

const ATTESTATION_TTL_SEC = 15 * 60;
const JWT_PURPOSE = "partner_membership_recovery";

function attestationSecret(): Uint8Array | null {
  const raw =
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET?.trim()
    || process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    || process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export function createRecoveryAttestationId(): string {
  return `pmra_${randomBytes(16).toString("hex")}`;
}

export type IssueRecoveryAttestationInput = {
  accountId: string;
  partnerId: string;
  applicationId: string;
};

export type IssueRecoveryAttestationResult =
  | { ok: true; attestationToken: string; attestationId: string; expiresAt: string }
  | { ok: false; code: string };

export async function issuePartnerMembershipRecoveryAttestation(
  input: IssueRecoveryAttestationInput,
): Promise<IssueRecoveryAttestationResult> {
  const accountId = input.accountId.trim();
  const partnerId = input.partnerId.trim();
  const applicationId = input.applicationId.trim();

  if (!isNativeAccountId(accountId)) {
    return { ok: false, code: "account_id_invalid" };
  }
  if (!partnerId || !applicationId) {
    return { ok: false, code: "partner_and_application_required" };
  }

  const secret = attestationSecret();
  if (!secret) {
    return { ok: false, code: "attestation_signing_unavailable" };
  }

  const attestationId = createRecoveryAttestationId();
  const expiresAt = new Date(Date.now() + ATTESTATION_TTL_SEC * 1000).toISOString();

  const record: RecoveryAttestationRecord = {
    attestationId,
    accountId,
    partnerId,
    applicationId,
    expiresAt,
  };

  try {
    await insertRecoveryAttestationRecord(record);
  } catch {
    return { ok: false, code: "attestation_persistence_failed" };
  }

  const token = await new SignJWT({
    purpose: JWT_PURPOSE,
    attestationId,
    partnerId,
    applicationId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(accountId)
    .setJti(attestationId)
    .setIssuedAt()
    .setExpirationTime(`${ATTESTATION_TTL_SEC}s`)
    .sign(secret);

  return { ok: true, attestationToken: token, attestationId, expiresAt };
}

export type VerifiedRecoveryAttestation = {
  attestationId: string;
  accountId: string;
  partnerId: string;
  applicationId: string;
};

export async function verifyPartnerMembershipRecoveryAttestationToken(
  token: string,
): Promise<VerifiedRecoveryAttestation | null> {
  const secret = attestationSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token.trim(), secret);
    if (payload.purpose !== JWT_PURPOSE) return null;
    const accountId = typeof payload.sub === "string" ? payload.sub.trim() : "";
    const attestationId = typeof payload.attestationId === "string" ? payload.attestationId.trim() : "";
    const partnerId = typeof payload.partnerId === "string" ? payload.partnerId.trim() : "";
    const applicationId = typeof payload.applicationId === "string" ? payload.applicationId.trim() : "";
    if (!isNativeAccountId(accountId) || !attestationId || !partnerId || !applicationId) {
      return null;
    }
    if (payload.jti && String(payload.jti) !== attestationId) return null;
    return { attestationId, accountId, partnerId, applicationId };
  } catch {
    return null;
  }
}

/** Bind attestation to the admin grant request and consume it exactly once. */
export async function consumeVerifiedRecoveryAttestation(
  verified: VerifiedRecoveryAttestation,
): Promise<boolean> {
  return consumeRecoveryAttestationRecord(verified);
}

export function recoveryAttestationRequestFingerprint(input: {
  accountId: string;
  partnerId: string;
  applicationId: string;
  attestationId: string;
}): string {
  return createHash("sha256")
    .update(
      `${input.attestationId}:${input.accountId}:${input.partnerId}:${input.applicationId}`,
      "utf8",
    )
    .digest("hex")
    .slice(0, 24);
}
