// FILE: lib/partner/resolveHolderIdentityEvidenceComplete.ts
// Server-authoritative identity/liveness evidence for method qualification.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  resolveCredentialStatus,
  resolveIdentityVerificationStatus,
} from "@/lib/idv/identityVerificationStates";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function resolveHolderIdentityEvidenceComplete(subjectId: string): Promise<boolean> {
  const sui = normalizeSuiAddress(subjectId);
  const sb = requireSupabaseAdmin();
  const { data: idv } = await sb
    .from("identity_verifications")
    .select("status, identity_verification_status, credential_jti, credential_status, veriff_session_id")
    .or(`sui_address.eq.${sui},wallet_address.eq.${sui}`)
    .maybeSingle();

  if (!idv) return false;
  const identityStatus = resolveIdentityVerificationStatus(idv);
  const credentialStatus = resolveCredentialStatus(idv);
  return identityStatus === "approved" && credentialStatus === "active";
}
