// FILE: app/api/auth/wallet/sandbox/presentation/prepare/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { getEphemeralSandboxForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { resolveSandboxPolicyAvailability } from "@/lib/auth/ephemeralWallet/sandboxPolicyAvailability";
import {
  buildEphemeralSandboxAgeTestCredential,
  isEphemeralSandboxAuthorizedTestIssuerEnabled,
} from "@/lib/protocolVerification/ephemeralAuthorizedTestIssuer";
import { SANDBOX_AGE_PRESENTATION_DISCLOSURE } from "@/lib/protocolVerification/sandboxAgePresentationCopy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403 });
  }

  const limited = await enforceNativeAuthRateLimit(req, "ephemeral_sandbox_presentation_prepare", 20);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: { policy_id?: string; presentation_method_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const policyId = String(body.policy_id ?? "").trim();
  const methodId = String(body.presentation_method_id ?? "authorized_test_issuer_credential").trim();
  if (!policyId) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const availability = resolveSandboxPolicyAvailability(policyId);
  if (!availability?.can_request_verification) {
    return NextResponse.json({ ok: false, code: "evidence_unavailable", availability }, { status: 422 });
  }

  const workspace = await getEphemeralSandboxForSession(auth.session.sessionId);
  if (!workspace) {
    return NextResponse.json({ ok: false, code: "sandbox_workspace_required" }, { status: 400 });
  }

  if (policyId === "age_21_retail" && methodId === "authorized_test_issuer_credential") {
    if (!isEphemeralSandboxAuthorizedTestIssuerEnabled()) {
      return NextResponse.json({ ok: false, code: "authorized_test_issuer_disabled" }, { status: 422 });
    }
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: auth.session.walletAddress,
    });
    return NextResponse.json({
      ok: true,
      test_only: true,
      production_usable: false,
      sandbox_labeled: true,
      presentation_method_id: methodId,
      disclosure: SANDBOX_AGE_PRESENTATION_DISCLOSURE,
      evidence: {
        kind: "passport_reusable_credential",
        credential: bundle.credential,
        portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      },
    });
  }

  return NextResponse.json({ ok: false, code: "presentation_method_unavailable" }, { status: 422 });
}
