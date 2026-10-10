// FILE: app/api/auth/holder-session/route.ts
// Holder session probe — wallet-first or zkLogin (sanitized).

import { NextRequest, NextResponse } from "next/server";
import { resolveHolderSession } from "@/lib/auth/holderBrowserSession";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function GET(req: NextRequest) {
  const session = await resolveHolderSession(req);
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
  }

  return NextResponse.json({
    ok: true,
    login_method: session.loginMethod,
    solana_address: session.solanaAddress,
    sui_address: session.suiAddress,
    holder_account_id: session.holderAccountId,
    claims_subject_key: session.claimsSubjectKey,
    passport_subject_ready: session.passportSubjectReady,
  }, { headers: NO_STORE });
}
