// FILE: app/api/auth/native/session/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  clearAccountSessionCookie,
  resolveAccountSession,
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

export async function DELETE() {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const res = NextResponse.json({ ok: true });
  clearAccountSessionCookie(res);
  return res;
}
