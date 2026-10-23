// FILE: lib/auth/nativeAccount/partnerMembershipInvitationGrant.ts
// Admin-authorized partner membership via auditable invitation grant (no API-key proof).

import type { PartnerMembershipRole } from "@/lib/auth/nativeAccount/contract";
import { ACCOUNT_SUBJECT_PREFIX } from "@/lib/auth/nativeAccount/contract";
import {
  assertPartnerMembership,
  recordMembershipGrant,
  upsertPartnerMembership,
  NativeAccountStoreUnavailableError,
} from "@/lib/auth/nativeAccount/store";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";

const ACCOUNT_ID_PATTERN = /^abx_ac_[a-f0-9]{32}$/;

export type PartnerMembershipInvitationGrantInput = {
  accountId: string;
  partnerId: string;
  applicationId: string;
  /** Launchpad console requires operator, admin, or owner — default operator. */
  role?: PartnerMembershipRole;
  reason: string;
  approverActorId: string;
  accountOwnershipVerified: boolean;
};

export type PartnerMembershipInvitationGrantResult =
  | {
      ok: true;
      partnerId: string;
      applicationId: string;
      accountId: string;
      role: PartnerMembershipRole;
      alreadyMember: boolean;
    }
  | { ok: false; code: string };

export function isValidNativeAccountSubjectId(accountId: string): boolean {
  return ACCOUNT_ID_PATTERN.test(accountId.trim());
}

/** Minimum role for Launchpad operator session without owner privileges. */
export const LAUNCHPAD_INVITATION_DEFAULT_ROLE: PartnerMembershipRole = "operator";

export async function grantPartnerMembershipByInvitation(
  input: PartnerMembershipInvitationGrantInput,
): Promise<PartnerMembershipInvitationGrantResult> {
  const accountId = input.accountId.trim();
  const partnerId = input.partnerId.trim();
  const applicationId = input.applicationId.trim();
  const reason = input.reason.trim();

  if (!isValidNativeAccountSubjectId(accountId)) {
    return { ok: false, code: "account_id_invalid" };
  }
  if (!partnerId || !applicationId) {
    return { ok: false, code: "partner_and_application_required" };
  }
  if (reason.length < 8) {
    return { ok: false, code: "reason_required" };
  }
  if (!input.accountOwnershipVerified) {
    return { ok: false, code: "account_ownership_not_verified" };
  }

  const role = input.role ?? LAUNCHPAD_INVITATION_DEFAULT_ROLE;
  if (role !== "operator" && role !== "admin" && role !== "owner") {
    return { ok: false, code: "role_invalid" };
  }
  if (role !== LAUNCHPAD_INVITATION_DEFAULT_ROLE) {
    return { ok: false, code: "role_must_be_operator" };
  }

  const app = await getLaunchpadApplicationById(applicationId);
  if (!app) {
    return { ok: false, code: "application_not_found" };
  }
  if (String(app.partner_id) !== partnerId) {
    return { ok: false, code: "application_partner_mismatch" };
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
    };
  }

  try {
    await upsertPartnerMembership({ accountId, partnerId, role });
    await recordMembershipGrant({
      accountId,
      partnerId,
      grantMethod: "invitation",
      metadata: {
        application_id: applicationId,
        reason,
        approver_actor_id: input.approverActorId,
        account_ownership_verified: true,
      },
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) {
      return { ok: false, code: "native_account_store_unavailable" };
    }
    throw error;
  }

  return {
    ok: true,
    partnerId,
    applicationId,
    accountId,
    role,
    alreadyMember: false,
  };
}
