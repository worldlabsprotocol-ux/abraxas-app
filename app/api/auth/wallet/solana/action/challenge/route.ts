// FILE: app/api/auth/wallet/solana/action/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import { assertEphemeralWalletAuthOperational, mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { issueWalletActionChallenge, type WalletActionOperation } from "@/lib/auth/ephemeralWallet/actionAuth";
import {
  attachWalletSolAuthContextCookie,
  readWalletSolAuthContextCookie,
} from "@/lib/auth/ephemeralWallet/service";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED: WalletActionOperation[] = ["sandbox:enter", "sandbox:verification:test"];

export async function POST(req: NextRequest) {
  const disabled = await assertEphemeralWalletAuthOperational();
  if (disabled) return disabled;

  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  const limited = await enforceNativeAuthRateLimit(req, "ephemeral_wallet_action_challenge", 30);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403 });
  }

  let body: { operation?: string; resource?: string; policy_id?: string; solana_network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const operation = String(body.operation ?? "") as WalletActionOperation;
  if (!ALLOWED.includes(operation)) {
    return NextResponse.json({ ok: false, code: "invalid_operation" }, { status: 400 });
  }

  const resource = String(body.resource ?? "").trim();
  if (!resource) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  let sessionContext = readWalletSolAuthContextCookie(req);
  if (!sessionContext) {
    sessionContext = randomBytes(16).toString("hex");
  }

  try {
    const result = await issueWalletActionChallenge({
      origin: requestOrigin,
      uri: `${requestOrigin}${req.nextUrl.pathname}`,
      walletAddress: auth.session.walletAddress,
      solanaNetwork: String(body.solana_network ?? auth.session.solanaNetwork),
      sessionContext,
      operation,
      resource,
      policyId: body.policy_id ?? null,
    });
    if (!result.ok) {
      const status = result.code === "store_unavailable" ? 503 : 400;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    const res = NextResponse.json({ ok: true, challenge: result.challenge, test_only: true });
    attachWalletSolAuthContextCookie(res, sessionContext);
    return res;
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
