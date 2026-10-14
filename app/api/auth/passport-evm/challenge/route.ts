// FILE: app/api/auth/passport-evm/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import {
  assertPassportWalletSameOriginRequest,
  attachHolderAuthContextCookie,
  issuePassportEvmAuthChallenge,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportEvmAuth/service";
import { requireChainNeutralIdentitySchema } from "@/lib/persistence/chainNeutralSchemaReady";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const schema = await requireChainNeutralIdentitySchema();
  if (!schema.ok) {
    return NextResponse.json({ ok: false, code: schema.code }, { status: schema.httpStatus, headers: NO_STORE });
  }

  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403, headers: NO_STORE });
  }

  let body: { wallet_address?: string; chain_id?: number; intended_action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const intended = body.intended_action?.trim() ?? HOLDER_AUTH_ACTIONS.passportSignIn;
  if (!Object.values(HOLDER_AUTH_ACTIONS).includes(intended as never)) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const sessionContext = randomBytes(16).toString("hex");
  const issued = await issuePassportEvmAuthChallenge({
    origin: requestOrigin,
    walletAddress: String(body.wallet_address ?? ""),
    chainId: Number(body.chain_id),
    intendedAction: intended as typeof HOLDER_AUTH_ACTIONS.passportSignIn,
    sessionContext,
  });

  if (!issued.ok) {
    const status = issued.code === "store_unavailable" || issued.code === "network_config_invalid" ? 503 : 400;
    return NextResponse.json({ ok: false, code: issued.code }, { status, headers: NO_STORE });
  }

  const res = NextResponse.json({ ok: true, challenge: issued.challenge }, { headers: NO_STORE });
  attachHolderAuthContextCookie(res, issued.sessionContext);
  return res;
}
