// FILE: app/api/auth/wallet/sandbox/enter/route.ts

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { assertEphemeralWalletAuthOperational, mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { verifyWalletActionAuthorization } from "@/lib/auth/ephemeralWallet/actionAuth";
import { readWalletSolAuthContextCookie } from "@/lib/auth/ephemeralWallet/service";
import { provisionEphemeralSandboxWorkspace } from "@/lib/auth/ephemeralWallet/provisionSandboxWorkspace";

export const dynamic = "force-dynamic";

function correlationId(): string {
  return `esbx_req_${randomBytes(8).toString("hex")}`;
}

export async function POST(req: NextRequest) {
  const requestId = correlationId();
  const operational = await assertEphemeralWalletAuthOperational();
  if (operational) {
    return NextResponse.json(
      {
        ok: false,
        code: "ephemeral_state_unavailable",
        correlation_id: requestId,
        stage: "operational_gate",
      },
      { status: operational.status },
    );
  }

  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json(
      { ok: false, code: "wrong_origin", correlation_id: requestId, stage: "origin_check" },
      { status: 403 },
    );
  }

  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, code: auth.error, correlation_id: requestId, stage: "session_scope" },
      { status: auth.status },
    );
  }

  let body: { action_challenge_id?: string; signature?: string; solana_network?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const hasActionAuth = Boolean(body.action_challenge_id && body.signature);

  if (hasActionAuth) {
    const sessionContext = readWalletSolAuthContextCookie(req);
    if (!sessionContext) {
      return NextResponse.json(
        {
          ok: false,
          code: "action_authorization_required",
          operation: "sandbox:enter",
          correlation_id: requestId,
          stage: "action_context_cookie",
        },
        { status: 403 },
      );
    }

    const action = await verifyWalletActionAuthorization({
      challengeId: String(body.action_challenge_id),
      walletAddress: auth.session.walletAddress,
      solanaNetwork: String(body.solana_network ?? auth.session.solanaNetwork),
      signature: String(body.signature),
      sessionContext,
      requestOrigin,
      expectedOperation: "sandbox:enter",
      expectedResource: `abraxas:sandbox:session:${auth.session.sessionId}`,
    });
    if (!action.ok) {
      const status =
        action.code === "expired" ? 410 : action.code === "replay" ? 409 : action.code === "store_unavailable" ? 503 : 401;
      return NextResponse.json(
        { ok: false, code: action.code, correlation_id: requestId, stage: "action_verify" },
        { status },
      );
    }
  }

  try {
    const { workspace, created } = await provisionEphemeralSandboxWorkspace({
      sessionId: auth.session.sessionId,
      walletAddress: auth.session.walletAddress,
    });

    return NextResponse.json({
      ok: true,
      workspace,
      created,
      idempotency_replay: !created,
      authorization_mode: hasActionAuth ? "wallet_action" : "wallet_session",
      test_only: true,
      correlation_id: requestId,
      stage: "workspace_ready",
      notice:
        "Sandbox workspace — expires automatically. Test privileges cannot authorize Production access.",
    });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) {
      return NextResponse.json(
        { ok: false, code: "ephemeral_state_unavailable", correlation_id: requestId, stage: "workspace_store" },
        { status: 503 },
      );
    }
    throw error;
  }
}
