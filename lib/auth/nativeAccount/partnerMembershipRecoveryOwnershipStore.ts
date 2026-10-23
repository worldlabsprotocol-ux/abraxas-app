// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryOwnershipStore.ts

import { nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { nativeAccountUsesMemory } from "@/lib/auth/nativeAccount/nativeAccountPersistence";
import { NativeAccountStoreUnavailableError } from "@/lib/auth/nativeAccount/store";

export type SandboxEnrollmentRow = {
  account_id: string;
  partner_id: string;
  application_id: string | null;
};

export async function findSandboxEnrollmentForApplication(
  applicationId: string,
): Promise<SandboxEnrollmentRow | null> {
  if (nativeAccountUsesMemory()) {
    return nativeAccountMemory.findEnrollmentByApplicationId(applicationId);
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("abraxas_sandbox_enrollments")
    .select("account_id, partner_id, application_id")
    .eq("application_id", applicationId)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  if (!data) return null;
  return {
    account_id: String(data.account_id),
    partner_id: String(data.partner_id),
    application_id: data.application_id ? String(data.application_id) : null,
  };
}

export async function findSandboxEnrollmentForAccountPartner(
  accountId: string,
  partnerId: string,
): Promise<SandboxEnrollmentRow | null> {
  if (nativeAccountUsesMemory()) {
    return nativeAccountMemory.findEnrollmentByAccountPartner(accountId, partnerId);
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("abraxas_sandbox_enrollments")
    .select("account_id, partner_id, application_id")
    .eq("account_id", accountId)
    .eq("partner_id", partnerId)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  if (!data) return null;
  return {
    account_id: String(data.account_id),
    partner_id: String(data.partner_id),
    application_id: data.application_id ? String(data.application_id) : null,
  };
}
