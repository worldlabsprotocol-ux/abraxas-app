// FILE: app/api/auth/native/solana/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { assertSolanaAccountAuthOperational, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import {
  attachAccountSolAuthContextCookie,
  issueAccountSolanaAuthChallenge,
} from "@/lib/auth/nativeAccount/solanaAuth/service";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const disabled = await assertSolanaAccountAuthOperational();
  if (disabled) return disabled;

  const limited = await enforceNativeAuthRateLimit(req, "solana_account_challenge", 30);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429, headers: NO_STORE });
  }

  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403, headers: NO_STORE });
  }

  let body: { wallet_address?: string; solana_network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const sessionContext = randomBytes(16).toString("hex");
  const uri = `${requestOrigin}/account/applications`;

  try {
    const issued = await issueAccountSolanaAuthChallenge({
      origin: requestOrigin,
      uri,
      walletAddress: String(body.wallet_address ?? ""),
      solanaNetwork: String(body.solana_network ?? process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet"),
      sessionContext,
    });

    if (!issued.ok) {
      const status =
        issued.code === "store_unavailable" || issued.code === "network_config_invalid" ? 503 : 400;
      return NextResponse.json({ ok: false, code: issued.code }, { status, headers: NO_STORE });
    }

    const res = NextResponse.json({ ok: true, challenge: issued.challenge }, { headers: NO_STORE });
    attachAccountSolAuthContextCookie(res, issued.sessionContext);
    return res;
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
