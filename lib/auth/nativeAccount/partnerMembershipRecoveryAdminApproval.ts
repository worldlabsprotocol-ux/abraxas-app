// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryAdminApproval.ts

import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { isNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import type { VerifiedRecoveryAttestation } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import {
  resolveRecoveryOwnershipEntitlement,
  type RecoveryOwnershipEntitlement,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnership";
import {
  consumeAdminRecoveryApprovalRecord,
  insertAdminRecoveryApprovalRecord,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAdminApprovalStore";
import { appendAuditEvent } from "@/lib/verification/audit";

const APPROVAL_TTL_SEC = 10 * 60;
const JWT_PURPOSE = "partner_membership_recovery_admin_approval";

function secret(): Uint8Array | null {
  const raw =
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET?.trim()
    || process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    || process.env.ABRAXAS_SIGNING_KEY?.trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export function createAdminRecoveryApprovalId(): string {
  return `pmraa_${randomBytes(16).toString("hex")}`;
}

export type IssueAdminRecoveryApprovalInput = {
  verifiedAttestation: VerifiedRecoveryAttestation;
  approverActorId: string;
  reason: string;
};

export type IssueAdminRecoveryApprovalResult =
  | {
      ok: true;
      adminOwnershipApprovalToken: string;
      approvalId: string;
      expiresAt: string;
      entitlement: RecoveryOwnershipEntitlement;
    }
  | { ok: false; code: string; enrolled_account_id?: string };

export async function issueAdminRecoveryOwnershipApproval(
  input: IssueAdminRecoveryApprovalInput,
): Promise<IssueAdminRecoveryApprovalResult> {
  const reason = input.reason.trim();
  if (reason.length < 16) {
    return { ok: false, code: "ownership_review_reason_required" };
  }

  const { accountId, partnerId, applicationId, attestationId } = input.verifiedAttestation;

  const entitlement = await resolveRecoveryOwnershipEntitlement({
    accountId,
    partnerId,
    applicationId,
  });
  if (entitlement.kind === "application_not_found") {
    return { ok: false, code: "application_not_found" };
  }
  if (entitlement.kind === "entitlement_conflict") {
    return {
      ok: false,
      code: "application_entitlement_conflict",
      enrolled_account_id: entitlement.enrolled_account_id,
    };
  }
  if (entitlement.kind === "server_verified_enrollment") {
    return { ok: false, code: "admin_ownership_approval_not_required" };
  }

  const signing = secret();
  if (!signing) {
    return { ok: false, code: "approval_signing_unavailable" };
  }

  const approvalId = createAdminRecoveryApprovalId();
  const expiresAt = new Date(Date.now() + APPROVAL_TTL_SEC * 1000).toISOString();

  const auditId = await appendAuditEvent({
    actor_type: "admin_operator",
    actor_id: input.approverActorId,
    action: "admin.native_account.partner_membership_recovery.ownership_review",
    object_type: "partner",
    object_id: partnerId,
    metadata: {
      account_id: accountId,
      application_id: applicationId,
      attestation_id: attestationId,
      ownership_basis: entitlement.basis,
      provisioning: entitlement.provisioning,
      reason,
    },
  });
  if (!auditId) {
    return { ok: false, code: "audit_persistence_failed" };
  }

  try {
    await insertAdminRecoveryApprovalRecord({
      approvalId,
      attestationId,
      accountId,
      partnerId,
      applicationId,
      approverActorId: input.approverActorId,
      ownershipBasis: entitlement.basis,
      reason,
      expiresAt,
      ownershipReviewAuditId: auditId,
    });
  } catch {
    return { ok: false, code: "approval_persistence_failed" };
  }

  const token = await new SignJWT({
    purpose: JWT_PURPOSE,
    approvalId,
    attestationId,
    partnerId,
    applicationId,
    ownershipBasis: entitlement.basis,
    ownershipReviewAuditId: auditId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(accountId)
    .setJti(approvalId)
    .setIssuedAt()
    .setExpirationTime(`${APPROVAL_TTL_SEC}s`)
    .sign(signing);

  return {
    ok: true,
    adminOwnershipApprovalToken: token,
    approvalId,
    expiresAt,
    entitlement,
  };
}

export type VerifiedAdminRecoveryApproval = {
  approvalId: string;
  attestationId: string;
  accountId: string;
  partnerId: string;
  applicationId: string;
  ownershipBasis: string;
};

export async function verifyAdminRecoveryOwnershipApprovalToken(
  token: string,
): Promise<VerifiedAdminRecoveryApproval | null> {
  const signing = secret();
  if (!signing) return null;
  try {
    const { payload } = await jwtVerify(token.trim(), signing);
    if (payload.purpose !== JWT_PURPOSE) return null;
    const accountId = typeof payload.sub === "string" ? payload.sub.trim() : "";
    const approvalId = typeof payload.approvalId === "string" ? payload.approvalId.trim() : "";
    const attestationId = typeof payload.attestationId === "string" ? payload.attestationId.trim() : "";
    const partnerId = typeof payload.partnerId === "string" ? payload.partnerId.trim() : "";
    const applicationId = typeof payload.applicationId === "string" ? payload.applicationId.trim() : "";
    const ownershipBasis = typeof payload.ownershipBasis === "string" ? payload.ownershipBasis.trim() : "";
    if (!isNativeAccountId(accountId) || !approvalId || !attestationId || !partnerId || !applicationId) {
      return null;
    }
    if (payload.jti && String(payload.jti) !== approvalId) return null;
    return {
      approvalId,
      attestationId,
      accountId,
      partnerId,
      applicationId,
      ownershipBasis,
    };
  } catch {
    return null;
  }
}

export async function consumeVerifiedAdminRecoveryApproval(
  verified: VerifiedAdminRecoveryApproval,
): Promise<boolean> {
  return consumeAdminRecoveryApprovalRecord(verified);
}
