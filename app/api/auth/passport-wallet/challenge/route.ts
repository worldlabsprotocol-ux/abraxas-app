// FILE: app/api/auth/passport-wallet/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { PASSPORT_WALLET_ACTIONS } from "@/lib/auth/passportWalletAuth/contract";
import { resolvePassportWalletRequestOrigin } from "@/lib/auth/passportWalletAuth/origin";
import {
  attachPassportWalletAuthContextCookie,
  issuePassportWalletAuthChallenge,
} from "@/lib/auth/passportWalletAuth/service";
import { createPassportWalletNonce } from "@/lib/auth/passportWalletAuth/store";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  let body: {
    wallet_address?: string;
    sui_network?: string;
    intended_action?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const intended = body.intended_action?.trim() ?? PASSPORT_WALLET_ACTIONS.passportSignIn;
  if (!Object.values(PASSPORT_WALLET_ACTIONS).includes(intended as never)) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  if (intended === PASSPORT_WALLET_ACTIONS.linkLegacyWallet) {
    const sessionGate = await requireBrowserSession(req);
    if (!sessionGate.ok) {
      return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401, headers: NO_STORE });
    }
    if (sessionGate.session.authMethod === "wallet") {
      return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 403, headers: NO_STORE });
    }
    let wallet: string;
    try {
      wallet = normalizeSuiAddress(String(body.wallet_address ?? "").trim());
    } catch {
      return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
    }
    if (wallet !== sessionGate.session.suiAddress) {
      return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 403, headers: NO_STORE });
    }
  }

  const sessionContext = createPassportWalletNonce();
  const issued = await issuePassportWalletAuthChallenge({
    origin: resolvePassportWalletRequestOrigin(req),
    walletAddress: String(body.wallet_address ?? ""),
    suiNetwork: String(body.sui_network ?? ""),
    intendedAction: intended as typeof PASSPORT_WALLET_ACTIONS.passportSignIn,
    sessionContext,
  });

  if (!issued.ok) {
    const status = issued.code === "store_unavailable" ? 503 : 400;
    return NextResponse.json({ ok: false, code: issued.code }, { status, headers: NO_STORE });
  }

  const res = NextResponse.json({ ok: true, challenge: issued.challenge }, { headers: NO_STORE });
  attachPassportWalletAuthContextCookie(res, issued.sessionContext);
  return res;
}
