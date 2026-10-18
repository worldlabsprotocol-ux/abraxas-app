// FILE: app/api/auth/native/session/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  ACCOUNT_SESSION_SIGN_OUT_SCOPE,
  clearAccountSessionCookie,
  resolveAccountSession,
  revokeCurrentAccountSessionFromRequest,
} from "@/lib/auth/accountSession";
import { listPartnerMemberships } from "@/lib/auth/nativeAccount/store";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { getPrimarySolanaWalletForAccount } from "@/lib/auth/nativeAccount/solanaAuth/store";
import { resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const session = await resolveAccountSession(req);
  if (!session) {
    return NextResponse.json({ ok: true, authenticated: false });
  }

  try {
    const memberships = await listPartnerMemberships(session.accountId);
    const solanaWallet =
      session.authMethod === "solana_wallet"
        ? await getPrimarySolanaWalletForAccount(session.accountId)
        : null;
    return NextResponse.json({
      ok: true,
      authenticated: true,
      account_id: session.accountId,
      auth_method: session.authMethod,
      session_id: session.sessionId,
      sign_out_scope: ACCOUNT_SESSION_SIGN_OUT_SCOPE,
      wallet_address: solanaWallet?.wallet_address ?? null,
      solana_network: solanaWallet?.solana_network ?? resolveAuthorizedSolanaNetworkFromEnv(),
      partner_memberships: memberships,
    });
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const revoked = await revokeCurrentAccountSessionFromRequest(req);
  const res = NextResponse.json({
    ok: true,
    revoked,
    scope: ACCOUNT_SESSION_SIGN_OUT_SCOPE,
  });
  clearAccountSessionCookie(res);
  return res;
}
