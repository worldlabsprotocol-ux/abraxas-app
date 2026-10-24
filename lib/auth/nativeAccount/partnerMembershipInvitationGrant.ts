// FILE: lib/auth/nativeAccount/partnerMembershipInvitationGrant.ts
// Admin-authorized partner membership via auditable invitation grant (no API-key proof).

import type { PartnerMembershipRole } from "@/lib/auth/nativeAccount/contract";
import { isNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import {
  assertPartnerMembership,
  getNativeAccountStatus,
  insertPartnerMembershipIfAbsent,
  recordMembershipGrant,
  revokePartnerMembership,
  NativeAccountStoreUnavailableError,
} from "@/lib/auth/nativeAccount/store";
import { assertPartnerMembershipInvitationEnvironment } from "@/lib/auth/nativeAccount/partnerMembershipInvitationEnvironment";
import {
  consumeVerifiedRecoveryAttestation,
  verifyPartnerMembershipRecoveryAttestationToken,
  type VerifiedRecoveryAttestation,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { appendAuditEvent } from "@/lib/verification/audit";
import { resolveRecoveryOwnershipEntitlement } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnership";
import {
  consumeVerifiedAdminRecoveryApproval,
  verifyAdminRecoveryOwnershipApprovalToken,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAdminApproval";

/** Minimum role for Launchpad operator session without owner privileges. */
export const LAUNCHPAD_INVITATION_DEFAULT_ROLE: PartnerMembershipRole = "operator";

export function isValidNativeAccountSubjectId(accountId: string): boolean {
  return isNativeAccountId(accountId);
}

export type PartnerMembershipInvitationGrantInput = {
  accountId: string;
  partnerId: string;
  applicationId: string;
  reason: string;
  approverActorId: string;
  recoveryAttestationToken: string;
  adminOwnershipApprovalToken?: string;
};

export type PartnerMembershipInvitationGrantResult =
  | {
      ok: true;
      partnerId: string;
      applicationId: string;
      accountId: string;
      role: PartnerMembershipRole;
      alreadyMember: boolean;
      auditEventId: string | null;
    }
  | { ok: false; code: string };

function attestationMatchesRequest(
  verified: VerifiedRecoveryAttestation,
  input: { accountId: string; partnerId: string; applicationId: string },
): boolean {
  return (
    verified.accountId === input.accountId
    && verified.partnerId === input.partnerId
    && verified.applicationId === input.applicationId
  );
}

export async function grantPartnerMembershipByInvitation(
  input: PartnerMembershipInvitationGrantInput,
): Promise<PartnerMembershipInvitationGrantResult> {
  const accountId = input.accountId.trim();
  const partnerId = input.partnerId.trim();
  const applicationId = input.applicationId.trim();
  const reason = input.reason.trim();
  const token = input.recoveryAttestationToken.trim();

  if (!isNativeAccountId(accountId)) {
    return { ok: false, code: "account_id_invalid" };
  }
  if (!partnerId || !applicationId) {
    return { ok: false, code: "partner_and_application_required" };
  }
  if (reason.length < 8) {
    return { ok: false, code: "reason_required" };
  }
  if (!token) {
    return { ok: false, code: "recovery_attestation_required" };
  }

  const verified = await verifyPartnerMembershipRecoveryAttestationToken(token);
  if (!verified) {
    return { ok: false, code: "recovery_attestation_invalid" };
  }
  if (!attestationMatchesRequest(verified, { accountId, partnerId, applicationId })) {
    return { ok: false, code: "recovery_attestation_mismatch" };
  }

  const accountStatus = await getNativeAccountStatus(accountId);
  if (!accountStatus) {
    return { ok: false, code: "account_not_found" };
  }
  if (accountStatus !== "active") {
    return { ok: false, code: "account_not_active" };
  }

  const app = await getLaunchpadApplicationById(applicationId);
  if (!app) {
    return { ok: false, code: "application_not_found" };
  }
  if (String(app.partner_id) !== partnerId) {
    return { ok: false, code: "application_partner_mismatch" };
  }

  const envGate = assertPartnerMembershipInvitationEnvironment(app);
  if (!envGate.ok) {
    return { ok: false, code: envGate.code };
  }

  const entitlement = await resolveRecoveryOwnershipEntitlement({
    accountId,
    partnerId,
    applicationId,
  });
  if (entitlement.kind === "application_not_found") {
    return { ok: false, code: "application_not_found" };
  }
  if (entitlement.kind === "entitlement_conflict") {
    return { ok: false, code: "application_entitlement_conflict" };
  }
  if (entitlement.kind === "admin_review_required") {
    const adminToken = input.adminOwnershipApprovalToken?.trim() ?? "";
    if (!adminToken) {
      return { ok: false, code: "admin_ownership_approval_required" };
    }
    const adminVerified = await verifyAdminRecoveryOwnershipApprovalToken(adminToken);
    if (!adminVerified) {
      return { ok: false, code: "admin_ownership_approval_invalid" };
    }
    if (
      adminVerified.attestationId !== verified.attestationId
      || adminVerified.accountId !== accountId
      || adminVerified.partnerId !== partnerId
      || adminVerified.applicationId !== applicationId
    ) {
      return { ok: false, code: "admin_ownership_approval_mismatch" };
    }
    const adminConsumed = await consumeVerifiedAdminRecoveryApproval(adminVerified);
    if (!adminConsumed) {
      return { ok: false, code: "admin_ownership_approval_already_consumed_or_expired" };
    }
  }

  const existing = await assertPartnerMembership(accountId, partnerId);
  if (existing.ok) {
    return {
      ok: true,
      partnerId,
      applicationId,
      accountId,
      role: existing.role,
      alreadyMember: true,
      auditEventId: null,
    };
  }

  const pendingAuditId = await appendAuditEvent({
    actor_type: "admin_operator",
    actor_id: input.approverActorId,
    action: "admin.native_account.partner_membership_invite.pending",
    object_type: "partner",
    object_id: partnerId,
    metadata: {
      account_id: accountId,
      application_id: applicationId,
      attestation_id: verified.attestationId,
      grant_method: "invitation",
      role: LAUNCHPAD_INVITATION_DEFAULT_ROLE,
      reason,
    },
  });
  if (!pendingAuditId) {
    return { ok: false, code: "audit_persistence_failed" };
  }

  const consumed = await consumeVerifiedRecoveryAttestation(verified);
  if (!consumed) {
    return { ok: false, code: "recovery_attestation_already_consumed_or_expired" };
  }

  try {
    const inserted = await insertPartnerMembershipIfAbsent({
      accountId,
      partnerId,
      role: LAUNCHPAD_INVITATION_DEFAULT_ROLE,
    });
    if (!inserted) {
      const raced = await assertPartnerMembership(accountId, partnerId);
      if (raced.ok) {
        return {
          ok: true,
          partnerId,
          applicationId,
          accountId,
          role: raced.role,
          alreadyMember: true,
          auditEventId: pendingAuditId,
        };
      }
      return { ok: false, code: "membership_insert_failed" };
    }

    await recordMembershipGrant({
      accountId,
      partnerId,
      grantMethod: "invitation",
      metadata: {
        application_id: applicationId,
        reason,
        approver_actor_id: input.approverActorId,
        attestation_id: verified.attestationId,
        pending_audit_event_id: pendingAuditId,
        account_verification: "native_session_recovery_attestation",
        ownership_basis:
          entitlement.kind === "server_verified_enrollment"
            ? entitlement.basis
            : "provisioning_review",
      },
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) {
      return { ok: false, code: "native_account_store_unavailable" };
    }
    throw error;
  }

  const completedAuditId = await appendAuditEvent({
    actor_type: "admin_operator",
    actor_id: input.approverActorId,
    action: "admin.native_account.partner_membership_invite.completed",
    object_type: "partner",
    object_id: partnerId,
    metadata: {
      account_id: accountId,
      application_id: applicationId,
      attestation_id: verified.attestationId,
      pending_audit_event_id: pendingAuditId,
      grant_method: "invitation",
      role: LAUNCHPAD_INVITATION_DEFAULT_ROLE,
    },
  });
  if (!completedAuditId) {
    await revokePartnerMembership(accountId, partnerId);
    return { ok: false, code: "audit_completion_failed" };
  }

  return {
    ok: true,
    partnerId,
    applicationId,
    accountId,
    role: LAUNCHPAD_INVITATION_DEFAULT_ROLE,
    alreadyMember: false,
    auditEventId: completedAuditId,
  };
}
