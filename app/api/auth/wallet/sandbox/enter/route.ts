// FILE: app/api/auth/wallet/sandbox/enter/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import {
  createEphemeralSandboxWorkspaceId,
  getEphemeralSandboxForSession,
  putEphemeralSandboxWorkspace,
} from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { EPHEMERAL_TTL } from "@/lib/auth/ephemeralWallet/retention";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireEphemeralWalletScope(req, "sandbox:enter");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
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
