// FILE: app/api/auth/passport-wallet/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  attachBrowserSessionCookie,
  issueBrowserSessionToken,
} from "@/lib/auth/browserSession";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { PASSPORT_WALLET_ACTIONS } from "@/lib/auth/passportWalletAuth/contract";
import {
  clearPassportWalletAuthContextCookie,
  readPassportWalletAuthContextCookie,
  verifyPassportWalletAuth,
} from "@/lib/auth/passportWalletAuth/service";
import { appendAuditEvent } from "@/lib/verification/audit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

const VERIFY_ALLOWED_ACTIONS = new Set<string>([
  PASSPORT_WALLET_ACTIONS.passportSignIn,
  PASSPORT_WALLET_ACTIONS.partnerVerify,
]);

export async function POST(req: NextRequest) {
  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403, headers: NO_STORE });
  }

  const sessionContext = readPassportWalletAuthContextCookie(req);
  if (!sessionContext) {
    return NextResponse.json({ ok: false, code: "session_context_mismatch" }, { status: 401, headers: NO_STORE });
  }

  let body: {
    challenge_id?: string;
    wallet_address?: string;
    sui_network?: string;
    signature?: string;
    intended_action?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const intendedAction = body.intended_action?.trim() ?? PASSPORT_WALLET_ACTIONS.passportSignIn;
  if (!VERIFY_ALLOWED_ACTIONS.has(intendedAction)) {
    return NextResponse.json({ ok: false, code: "wrong_action" }, { status: 400, headers: NO_STORE });
  }

  const verified = await verifyPassportWalletAuth({
    challengeId: String(body.challenge_id ?? ""),
    walletAddress: String(body.wallet_address ?? ""),
    suiNetwork: String(body.sui_network ?? ""),
    signature: String(body.signature ?? ""),
    sessionContext,
    requestOrigin,
    expectedIntendedAction: intendedAction as typeof PASSPORT_WALLET_ACTIONS.passportSignIn,
  });

  if (!verified.ok) {
    const status =
      verified.code === "invalid_signature" || verified.code === "replay" ? 401
        : verified.code === "legacy_link_required" ? 409
          : verified.code === "store_unavailable" ? 503
            : 400;
    return NextResponse.json({ ok: false, code: verified.code }, { status, headers: NO_STORE });
  }

  const token = await issueBrowserSessionToken(verified.result.sui_address, { authMethod: "wallet" });
  if (!token) {
    return NextResponse.json({ ok: false, code: "session_unavailable" }, { status: 503, headers: NO_STORE });
  }

  try {
    await appendAuditEvent({
      actor_type: "holder",
      actor_id: verified.result.sui_address,
      action: "passport_wallet_auth_success",
      object_type: "passport_identity",
      object_id: verified.result.sui_address,
      metadata: {
        created_identity: verified.result.created_identity,
        provider: verified.result.provider,
      },
    });
  } catch {
    // audit best-effort
  }

  const res = NextResponse.json(
    {
      ok: true,
      sui_address: verified.result.sui_address,
      provider: verified.result.provider,
      session_kind: verified.result.session_kind,
      created_identity: verified.result.created_identity,
    },
    { headers: NO_STORE },
  );
  attachBrowserSessionCookie(res, token);
  clearPassportWalletAuthContextCookie(res);
  return res;
}
