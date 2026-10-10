// FILE: app/api/idv/register-session/route.ts
// Store Veriff session id against holder for decision polling.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireHolderRequestContext, holderClaimsSubjectKey } from "@/lib/holder/holderRequestContext";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const auth = await requireHolderRequestContext(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    sui_address?: string;
    session_id?: string;
    email?: string;
  };

  const sessionId = body.session_id?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  if (body.sui_address && normalizeSuiAddress(body.sui_address) !== holderClaimsSubjectKey(auth.ctx)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const sui = holderClaimsSubjectKey(auth.ctx);
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  await sb.from("identity_verifications").upsert({
    wallet_address: sui,
    sui_address: sui,
    holder_account_id: auth.ctx.mode === "solana_native" ? auth.ctx.holderAccountId : null,
    user_email: body.email ?? null,
    veriff_session_id: sessionId,
    status: "pending",
    liveness_provider: "veriff",
    updated_at: new Date().toISOString(),
  }, { onConflict: "wallet_address" });

  return NextResponse.json({ ok: true, session_id: sessionId });
}
