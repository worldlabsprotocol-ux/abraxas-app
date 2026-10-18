// FILE: app/api/auth/wallet/sandbox/enter/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import {
  createEphemeralSandboxWorkspaceId,
  getEphemeralSandboxForSession,
  putEphemeralSandboxWorkspace,
} from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { EPHEMERAL_TTL } from "@/lib/auth/ephemeralWallet/retention";
import { verifyWalletActionAuthorization } from "@/lib/auth/ephemeralWallet/actionAuth";
import { readWalletSolAuthContextCookie } from "@/lib/auth/ephemeralWallet/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403 });
  }

  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: { action_challenge_id?: string; signature?: string; solana_network?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const sessionContext = readWalletSolAuthContextCookie(req);
  if (!sessionContext || !body.action_challenge_id || !body.signature) {
    return NextResponse.json(
      { ok: false, code: "action_authorization_required", operation: "sandbox:enter" },
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
    return NextResponse.json({ ok: false, code: action.code }, { status });
  }

  try {
    const existing = await getEphemeralSandboxForSession(auth.session.sessionId);
    if (existing) {
      return NextResponse.json({
        ok: true,
        workspace: existing,
        idempotency_replay: true,
        expires_at: existing.expires_at,
        test_only: true,
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + EPHEMERAL_TTL.sandboxWorkspaceSec * 1000);
    const workspace = {
      workspace_id: createEphemeralSandboxWorkspaceId(),
      wallet_address: auth.session.walletAddress,
      session_id: auth.session.sessionId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };
    await putEphemeralSandboxWorkspace(workspace);

    return NextResponse.json({
      ok: true,
      workspace,
      test_only: true,
      notice:
        "Ephemeral sandbox workspace — expires automatically. Full Launchpad persistence requires explicit durable activation.",
    });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
