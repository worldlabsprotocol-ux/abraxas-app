// FILE: lib/privacy/privacySubjectAccess.ts
// Runtime partner-flow gate for approved deletion (access revoked, purge pending).

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

const PRIVACY_ACCESS_REVOKED_STATUS = "access_revoked_pending_purge";

export async function subjectHasPrivacyAccessRevoked(subjectId: string): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(subjectId);

  const { data } = await sb
    .from("privacy_requests")
    .select("id")
    .eq("subject_sui", subject)
    .eq("request_type", "account_deletion")
    .eq("status", PRIVACY_ACCESS_REVOKED_STATUS)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}
