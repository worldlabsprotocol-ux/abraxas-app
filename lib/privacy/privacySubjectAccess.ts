// FILE: lib/privacy/privacySubjectAccess.ts
// Runtime partner-flow gate for approved deletion (access revoked, purge pending).

import { normalizeStoredHolderKey } from "@/lib/auth/holderSubject/normalizeSubjectKey";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

const PRIVACY_ACCESS_REVOKED_STATUS = "access_revoked_pending_purge";

export async function subjectHasPrivacyAccessRevoked(subjectId: string): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeStoredHolderKey(subjectId);

  const { data, error } = await sb
    .from("privacy_requests")
    .select("id")
    .eq("subject_sui", subject)
    .eq("request_type", "account_deletion")
    .eq("status", PRIVACY_ACCESS_REVOKED_STATUS)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("privacy_access_status_unavailable");
  return Boolean(data);
}
