// FILE: app/api/auth/wallet/solana/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import {
  assertEphemeralWalletAuthOperational,
  mapEphemeralStoreError,
} from "@/lib/auth/ephemeralWallet/apiGate";
import {
  clearWalletSolAuthContextCookie,
  readWalletSolAuthContextCookie,
  verifyEphemeralWalletAuth,
} from "@/lib/auth/ephemeralWallet/service";
import {
  attachWalletSessionCookie,
  issueEphemeralWalletSessionToken,
} from "@/lib/auth/ephemeralWallet/walletSession";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const disabled = await assertEphemeralWalletAuthOperational();
  if (disabled) return disabled;

  const limited = await enforceNativeAuthRateLimit(req, "ephemeral_wallet_verify", 20);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429, headers: NO_STORE });
  }

  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403, headers: NO_STORE });
  }

  const sessionContext = readWalletSolAuthContextCookie(req);
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
    const result = await verifyEphemeralWalletAuth({
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

    const token = await issueEphemeralWalletSessionToken({
      walletAddress: result.walletAddress,
      solanaNetwork: result.solanaNetwork,
    });
    if (!token) {
      return NextResponse.json({ ok: false, code: "session_unavailable" }, { status: 503, headers: NO_STORE });
    }

    const res = NextResponse.json(
      {
        ok: true,
        authenticated: true,
        auth_mode: "ephemeral_wallet",
        wallet_address: result.walletAddress,
        solana_network: result.solanaNetwork,
        persistent_account_created: false,
      },
      { headers: NO_STORE },
    );
    attachWalletSessionCookie(res, token);
    clearWalletSolAuthContextCookie(res);
    return res;
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
