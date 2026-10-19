// FILE: app/api/auth/wallet/session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { assertEphemeralWalletAuthEnabled, mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { EphemeralStateUnavailableError } from "@/lib/auth/ephemeralWallet/errors";
import {
  clearWalletSessionCookie,
  resolveEphemeralWalletSession,
  revokeEphemeralWalletSessionFromRequest,
  WALLET_SESSION_COOKIE,
} from "@/lib/auth/ephemeralWallet/walletSession";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

function sessionExpiresAtIso(req: NextRequest): string | null {
  const token = req.cookies.get(WALLET_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    if (typeof payload.exp !== "number") return null;
    return new Date(payload.exp * 1000).toISOString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const disabled = assertEphemeralWalletAuthEnabled();
  if (disabled) return disabled;

  let session;
  try {
    session = await resolveEphemeralWalletSession(req);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) {
      const mapped = mapEphemeralStoreError(error);
      if (mapped) return mapped;
    }
    throw error;
  }
  if (!session) {
    return NextResponse.json(
      { ok: true, authenticated: false, auth_mode: "ephemeral_wallet" },
      { headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      auth_mode: "ephemeral_wallet",
      wallet_address: session.walletAddress,
      solana_network: session.solanaNetwork,
      session_id: session.sessionId,
      scopes: session.scopes,
      expires_at: sessionExpiresAtIso(req),
      persistent_account: false,
    },
    { headers: NO_STORE },
  );
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
