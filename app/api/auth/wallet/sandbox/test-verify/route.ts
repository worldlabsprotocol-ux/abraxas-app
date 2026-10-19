// FILE: app/api/auth/wallet/sandbox/test-verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { getEphemeralSandboxForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { runEphemeralProtocolSandboxVerification } from "@/lib/protocolVerification/runSandboxVerification";
import { verifyWalletActionAuthorization } from "@/lib/auth/ephemeralWallet/actionAuth";
import { readWalletSolAuthContextCookie } from "@/lib/auth/ephemeralWallet/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403 });
  }

  const limited = await enforceNativeAuthRateLimit(req, "ephemeral_sandbox_test_verify", 15);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: {
    policy_id?: string;
    action_challenge_id?: string;
    signature?: string;
    solana_network?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }
  const policyId = String(body.policy_id ?? "").trim();
  if (!policyId) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const sessionContext = readWalletSolAuthContextCookie(req);
  if (!sessionContext || !body.action_challenge_id || !body.signature) {
    return NextResponse.json(
      { ok: false, code: "action_authorization_required", operation: "sandbox:verification:test" },
      { status: 403 },
    );
  }

  const workspace = await getEphemeralSandboxForSession(auth.session.sessionId);
  if (!workspace) {
    return NextResponse.json({ ok: false, code: "sandbox_workspace_required" }, { status: 400 });
  }

  const resource = `abraxas:sandbox:${workspace.workspace_id}:policy:${policyId}`;
  const action = await verifyWalletActionAuthorization({
    challengeId: String(body.action_challenge_id),
    walletAddress: auth.session.walletAddress,
    solanaNetwork: String(body.solana_network ?? auth.session.solanaNetwork),
    signature: String(body.signature),
    sessionContext,
    requestOrigin,
    expectedOperation: "sandbox:verification:test",
    expectedResource: resource,
    expectedPolicyId: policyId,
  });
  if (!action.ok) {
    const status =
      action.code === "expired" ? 410 : action.code === "replay" ? 409 : action.code === "store_unavailable" ? 503 : 401;
    return NextResponse.json({ ok: false, code: action.code }, { status });
  }

  try {
    const outcome = await runEphemeralProtocolSandboxVerification({
      workspaceId: workspace.workspace_id,
      walletAddress: auth.session.walletAddress,
      policyId,
    });
    if (!outcome.ok) {
      const status =
        outcome.code === "store_unavailable"
          ? 503
          : outcome.code === "insufficient_evidence_for_policy" || outcome.unsupported
            ? 422
            : 400;
      return NextResponse.json(
        { ok: false, code: outcome.code, unsupported: outcome.unsupported ?? false },
        { status },
      );
    }

    return NextResponse.json({
      ok: true,
      test_only: true,
      production_usable: false,
      decision: outcome.decision,
      result: outcome.result,
      validate_path: outcome.validate_path,
    });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
