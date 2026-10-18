// FILE: app/api/auth/native/solana/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { attachAccountSessionCookie, issueAccountSessionToken } from "@/lib/auth/accountSession";
import { assertSolanaAccountAuthOperational, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import {
  clearAccountSolAuthContextCookie,
  readAccountSolAuthContextCookie,
  verifyAccountSolanaAuth,
} from "@/lib/auth/nativeAccount/solanaAuth/service";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const disabled = await assertSolanaAccountAuthOperational();
  if (disabled) return disabled;

  const limited = await enforceNativeAuthRateLimit(req, "solana_account_verify", 20);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429, headers: NO_STORE });
  }

  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403, headers: NO_STORE });
  }

  const sessionContext = readAccountSolAuthContextCookie(req);
  if (!sessionContext) {
    return NextResponse.json({ ok: false, code: "session_context_missing" }, { status: 400, headers: NO_STORE });
  }

  let body: { challenge_id?: string; wallet_address?: string; solana_network?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const challengeId = String(body.challenge_id ?? "");
  const signature = String(body.signature ?? "");
  if (!challengeId || !signature) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await verifyAccountSolanaAuth({
      challengeId,
      walletAddress: String(body.wallet_address ?? ""),
      solanaNetwork: String(body.solana_network ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet"),
      signature,
      sessionContext,
      requestOrigin,
    });

    if (!result.ok) {
      const status =
        result.code === "expired" ? 410 : result.code === "replay" ? 409 : result.code === "store_unavailable" ? 503 : 401;
      return NextResponse.json({ ok: false, code: result.code }, { status, headers: NO_STORE });
    }

    const token = await issueAccountSessionToken(result.accountId, "solana_wallet");
    if (!token) {
      return NextResponse.json({ ok: false, code: "session_unavailable" }, { status: 503, headers: NO_STORE });
    }

    const res = NextResponse.json(
      {
        ok: true,
        account_id: result.accountId,
        wallet_address: result.walletAddress,
        created: result.created,
        authenticated: true,
      },
      { headers: NO_STORE },
    );
    attachAccountSessionCookie(res, token);
    clearAccountSolAuthContextCookie(res);
    return res;
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
