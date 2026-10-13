// FILE: app/api/auth/passport-evm/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { attachBrowserSessionCookie, issueBrowserSessionFromInput } from "@/lib/auth/browserSession";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import {
  assertPassportWalletSameOriginRequest,
  clearHolderAuthContextCookie,
  readHolderAuthContextCookie,
  resolvePassportWalletRequestOrigin,
  verifyPassportEvmAuth,
} from "@/lib/auth/passportEvmAuth/service";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

const ALLOWED = new Set<string>([HOLDER_AUTH_ACTIONS.passportSignIn, HOLDER_AUTH_ACTIONS.partnerVerify]);

export async function POST(req: NextRequest) {
  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403, headers: NO_STORE });
  }

  const sessionContext = readHolderAuthContextCookie(req);
  if (!sessionContext) {
    return NextResponse.json({ ok: false, code: "session_context_mismatch" }, { status: 401, headers: NO_STORE });
  }

  let body: {
    challenge_id?: string;
    wallet_address?: string;
    chain_id?: number;
    signature?: string;
    intended_action?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const intendedAction = body.intended_action?.trim() ?? HOLDER_AUTH_ACTIONS.passportSignIn;
  if (!ALLOWED.has(intendedAction)) {
    return NextResponse.json({ ok: false, code: "wrong_action" }, { status: 400, headers: NO_STORE });
  }

  const verified = await verifyPassportEvmAuth({
    challengeId: String(body.challenge_id ?? ""),
    walletAddress: String(body.wallet_address ?? ""),
    chainId: Number(body.chain_id),
    signature: String(body.signature ?? ""),
    sessionContext,
    requestOrigin,
    expectedIntendedAction: intendedAction as typeof HOLDER_AUTH_ACTIONS.passportSignIn,
  });

  if (!verified.ok) {
    const status =
      verified.code === "invalid_signature" || verified.code === "replay" ? 401
        : verified.code === "store_unavailable" || verified.code === "network_config_invalid" ? 503
          : 400;
    return NextResponse.json({ ok: false, code: verified.code }, { status, headers: NO_STORE });
  }

  const token = await issueBrowserSessionFromInput({
    holderSubjectId: verified.holderSubjectId,
    authMethod: "evm_wallet",
    walletCaip10: verified.caip10,
  });
  if (!token) {
    return NextResponse.json({ ok: false, code: "session_unavailable" }, { status: 503, headers: NO_STORE });
  }

  const res = NextResponse.json(
    {
      ok: true,
      holder_subject_id: verified.holderSubjectId,
      wallet_caip10: verified.caip10,
      created_identity: verified.created,
    },
    { headers: NO_STORE },
  );
  attachBrowserSessionCookie(res, token);
  clearHolderAuthContextCookie(res);
  return res;
}
