// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryAttestationStore.ts

import { nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import type { VerifiedRecoveryAttestation } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import { nativeAccountUsesMemory } from "@/lib/auth/nativeAccount/nativeAccountPersistence";
import { NativeAccountStoreUnavailableError } from "@/lib/auth/nativeAccount/store";

export type RecoveryAttestationRecord = {
  attestationId: string;
  accountId: string;
  partnerId: string;
  applicationId: string;
  expiresAt: string;
};

export async function insertRecoveryAttestationRecord(record: RecoveryAttestationRecord): Promise<void> {
  if (nativeAccountUsesMemory()) {
    nativeAccountMemory.insertRecoveryAttestation(record);
    return;
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("abraxas_partner_membership_recovery_attestations").insert({
    attestation_id: record.attestationId,
    account_id: record.accountId,
    partner_id: record.partnerId,
    application_id: record.applicationId,
    expires_at: record.expiresAt,
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
}

export async function consumeRecoveryAttestationRecord(
  verified: VerifiedRecoveryAttestation,
): Promise<boolean> {
  if (nativeAccountUsesMemory()) {
    return nativeAccountMemory.consumeRecoveryAttestation(verified);
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("abraxas_consume_partner_membership_recovery_attestation", {
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
