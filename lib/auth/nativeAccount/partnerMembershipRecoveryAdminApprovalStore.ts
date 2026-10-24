// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryAdminApprovalStore.ts

import { nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { nativeAccountUsesMemory } from "@/lib/auth/nativeAccount/nativeAccountPersistence";
import type { VerifiedAdminRecoveryApproval } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAdminApproval";
import { NativeAccountStoreUnavailableError } from "@/lib/auth/nativeAccount/store";

export async function insertAdminRecoveryApprovalRecord(input: {
  approvalId: string;
  attestationId: string;
  accountId: string;
  partnerId: string;
  applicationId: string;
  approverActorId: string;
  ownershipBasis: string;
  reason: string;
  expiresAt: string;
  ownershipReviewAuditId: string;
}): Promise<void> {
  if (nativeAccountUsesMemory()) {
    nativeAccountMemory.insertAdminRecoveryApproval({
      approvalId: input.approvalId,
      attestationId: input.attestationId,
      accountId: input.accountId,
      partnerId: input.partnerId,
      applicationId: input.applicationId,
      approverActorId: input.approverActorId,
      ownershipBasis: input.ownershipBasis,
      reason: input.reason,
      expiresAt: input.expiresAt,
    });
    return;
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("abraxas_partner_membership_recovery_admin_approvals").insert({
    approval_id: input.approvalId,
    attestation_id: input.attestationId,
    account_id: input.accountId,
    partner_id: input.partnerId,
    application_id: input.applicationId,
    approver_actor_id: input.approverActorId,
    ownership_basis: input.ownershipBasis,
    reason: input.reason,
    expires_at: input.expiresAt,
  });
  void input.ownershipReviewAuditId;
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
}

export async function consumeAdminRecoveryApprovalRecord(
  verified: VerifiedAdminRecoveryApproval,
): Promise<boolean> {
  if (nativeAccountUsesMemory()) {
    return nativeAccountMemory.consumeAdminRecoveryApproval(verified);
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("abraxas_consume_partner_membership_recovery_admin_approval", {
    p_approval_id: verified.approvalId,
    p_attestation_id: verified.attestationId,
    p_account_id: verified.accountId,
    p_partner_id: verified.partnerId,
    p_application_id: verified.applicationId,
  });
  if (error) {
    if (error.code === "42883" || error.code === "42P01") {
      throw new NativeAccountStoreUnavailableError();
    }
    throw error;
  }
  return data === true;
}
