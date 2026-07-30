// FILE: app/api/credentials/revoke/route.ts
// Revoke a subject's credential and active claims (admin / declined IDV).

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { revokeSubjectClaims } from "@/lib/credentials/claimsService";
import { appendAuditEvent } from "@/lib/verification/audit";
import { checkAdminAccess } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    sui_address?: string;
    reason?: string;
    jti?: string;
  };

  if (!body.sui_address) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const subject = normalizeSuiAddress(body.sui_address);
  const reason = body.reason ?? "manual_revocation";

  const { data: cred } = await sb
    .from("abraxas_credentials")
    .select("jti")
    .or(`sui_address.eq.${subject},holder_wallet.eq.${subject}`)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const jti = body.jti ?? cred?.jti;

  await revokeSubjectClaims(subject, reason, jti ?? undefined);

  await sb.from("identity_verifications")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .or(`sui_address.eq.${subject},wallet_address.eq.${subject}`);

  await appendAuditEvent({
    actor_type: "admin",
    actor_id: "revoke_api",
    action: "credential.revoked",
    object_type: "subject",
    object_id: subject,
    metadata: { reason, jti },
  });

  return NextResponse.json({ ok: true, subject_id: subject, revoked_jti: jti ?? null });
}
