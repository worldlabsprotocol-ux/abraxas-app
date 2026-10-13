// FILE: app/api/auth/wallet-login/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isWalletFirstAuthEnabled } from "@/lib/auth/walletLogin/featureFlag";
import { mintHolderWalletLoginChallenge } from "@/lib/auth/walletLogin/service";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  if (!isWalletFirstAuthEnabled()) {
    return NextResponse.json({ error: "Wallet-first auth is not enabled" }, { status: 404, headers: NO_STORE });
  }

  const body = (await req.json().catch(() => ({}))) as {
    solana_address?: string;
    continue_path?: string;
  };

  const solanaAddress = body.solana_address?.trim();
  if (!solanaAddress) {
    return NextResponse.json({ error: "solana_address required" }, { status: 400, headers: NO_STORE });
  }

  const result = await mintHolderWalletLoginChallenge({
    solanaAddress,
    continuePath: body.continue_path,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503, headers: NO_STORE });
  }

  return NextResponse.json({
    ok: true,
    challenge_id: result.challengeId,
    message: result.message,
    expires_at: result.expiresAt,
  }, { headers: NO_STORE });
}
