// FILE: app/api/auth/wallet/session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { assertEphemeralWalletAuthEnabled } from "@/lib/auth/ephemeralWallet/apiGate";
import {
  clearWalletSessionCookie,
  resolveEphemeralWalletSession,
  revokeEphemeralWalletSessionFromRequest,
} from "@/lib/auth/ephemeralWallet/walletSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const disabled = assertEphemeralWalletAuthEnabled();
  if (disabled) return disabled;

  const session = await resolveEphemeralWalletSession(req);
  if (!session) {
    return NextResponse.json({ ok: true, authenticated: false, auth_mode: "ephemeral_wallet" });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    auth_mode: "ephemeral_wallet",
    wallet_address: session.walletAddress,
    solana_network: session.solanaNetwork,
    session_id: session.sessionId,
    scopes: session.scopes,
    persistent_account: false,
  });
}

export async function DELETE(req: NextRequest) {
  const disabled = assertEphemeralWalletAuthEnabled();
  if (disabled) return disabled;

  const revoked = await revokeEphemeralWalletSessionFromRequest(req);
  const res = NextResponse.json({
    ok: true,
    revoked,
    scope: "current_session_only",
    auth_mode: "ephemeral_wallet",
  });
  clearWalletSessionCookie(res);
  return res;
}
