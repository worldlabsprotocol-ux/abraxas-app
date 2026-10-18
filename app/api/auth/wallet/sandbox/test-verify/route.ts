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
import { runEphemeralSandboxTestVerification } from "@/lib/auth/ephemeralWallet/sandboxTestVerification";

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

  const auth = await requireEphemeralWalletScope(req, "sandbox:verification:test");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: { policy_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }
  const policyId = String(body.policy_id ?? "").trim();
  if (!policyId) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  try {
    const workspace = await getEphemeralSandboxForSession(auth.session.sessionId);
    if (!workspace) {
      return NextResponse.json({ ok: false, code: "sandbox_workspace_required" }, { status: 400 });
    }

    const outcome = await runEphemeralSandboxTestVerification({
      workspaceId: workspace.workspace_id,
      walletAddress: auth.session.walletAddress,
      policyId,
    });
    if (!outcome.ok) {
      const status = outcome.code === "store_unavailable" ? 503 : 400;
      return NextResponse.json({ ok: false, code: outcome.code }, { status });
    }

    return NextResponse.json({
      ok: true,
      test_only: true,
      production_usable: false,
      result: outcome.result,
      validate_path: `/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(outcome.result.receipt_id))}`,
    });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
