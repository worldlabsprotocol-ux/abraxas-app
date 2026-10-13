// FILE: app/api/auth/passport-wallet/link-legacy/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  attachBrowserSessionCookie,
  issueBrowserSessionToken,
  requireBrowserSession,
} from "@/lib/auth/browserSession";
import { resolvePassportWalletRequestOrigin } from "@/lib/auth/passportWalletAuth/origin";
import { linkLegacyPassportWallet } from "@/lib/auth/passportWalletAuth/legacyLink";
import {
  clearPassportWalletAuthContextCookie,
  readPassportWalletAuthContextCookie,
} from "@/lib/auth/passportWalletAuth/service";
import { appendAuditEvent } from "@/lib/verification/audit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const sessionGate = await requireBrowserSession(req);
  if (!sessionGate.ok) {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  if (sessionGate.session.authMethod === "wallet") {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 403, headers: NO_STORE });
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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400, headers: NO_STORE });
  }

  const linked = await linkLegacyPassportWallet({
    challengeId: String(body.challenge_id ?? ""),
    walletAddress: String(body.wallet_address ?? ""),
    suiNetwork: String(body.sui_network ?? ""),
    signature: String(body.signature ?? ""),
    sessionContext,
    requestOrigin: resolvePassportWalletRequestOrigin(req),
    sessionSuiAddress: sessionGate.session.suiAddress,
  });

  if (!linked.ok) {
    const status =
      linked.code === "invalid_signature" || linked.code === "replay" ? 401
        : linked.code === "unauthorized" ? 403
          : linked.code === "store_unavailable" ? 503
            : 400;
    return NextResponse.json({ ok: false, code: linked.code }, { status, headers: NO_STORE });
  }

  const token = await issueBrowserSessionToken(linked.suiAddress, { authMethod: "wallet" });
  if (!token) {
    return NextResponse.json({ ok: false, code: "session_unavailable" }, { status: 503, headers: NO_STORE });
  }

  try {
    await appendAuditEvent({
      actor_type: "holder",
      actor_id: linked.suiAddress,
      action: "passport_wallet_legacy_link",
      object_type: "passport_identity",
      object_id: linked.suiAddress,
      metadata: {
        legacy_provider: linked.legacyProvider,
        already_linked: linked.alreadyLinked,
      },
    });
  } catch {
    // audit best-effort
  }

  const res = NextResponse.json(
    {
      ok: true,
      sui_address: linked.suiAddress,
      legacy_provider: linked.legacyProvider,
      already_linked: linked.alreadyLinked,
    },
    { headers: NO_STORE },
  );
  attachBrowserSessionCookie(res, token);
  clearPassportWalletAuthContextCookie(res);
  return res;
}
