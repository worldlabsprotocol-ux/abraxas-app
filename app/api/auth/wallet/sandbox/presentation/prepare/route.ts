// FILE: app/api/auth/wallet/sandbox/presentation/prepare/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { getEphemeralSandboxForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { resolveSandboxPolicyAvailability } from "@/lib/auth/ephemeralWallet/sandboxPolicyAvailability";
import {
  buildEphemeralSandboxAgeTestCredential,
  isSandboxTestIssuerRuntimeAllowed,
} from "@/lib/protocolVerification/ephemeralAuthorizedTestIssuer";
import { SANDBOX_AGE_PRESENTATION_DISCLOSURE } from "@/lib/protocolVerification/sandboxAgePresentationCopy";
import { resolveEphemeralSandboxTestPolicy } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";
import { hashSandboxCredentialPresentationBundle } from "@/lib/protocolVerification/sandboxPresentationBinding";
import {
  createSandboxPresentationCommitId,
  storeSandboxPresentationCommit,
} from "@/lib/auth/ephemeralWallet/sandboxPresentationCommitStore";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";

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
    if (!isSandboxTestIssuerRuntimeAllowed()) {
      return NextResponse.json({ ok: false, code: "authorized_test_issuer_disabled" }, { status: 422 });
    }
    const sandboxPolicy = resolveEphemeralSandboxTestPolicy(policyId);
    if (!sandboxPolicy) {
      return NextResponse.json({ ok: false, code: "invalid_policy" }, { status: 400 });
    }
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: auth.session.walletAddress,
    });
    const credential = bundle.credential as SignedPassportReusableCredential;
    const snapshot = bundle.portable_revocation_snapshot as PortableRevocationSignedArtifact;
    const evidenceHash = hashSandboxCredentialPresentationBundle({
      policy_id: policyId,
      policy_version: sandboxPolicy.policy_version,
      workspace_id: workspace.workspace_id,
      wallet_address: auth.session.walletAddress,
      credential,
      portable_revocation_snapshot: snapshot,
    });
    const commitId = createSandboxPresentationCommitId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    try {
      await storeSandboxPresentationCommit({
        commit_id: commitId,
        session_id: auth.session.sessionId,
        workspace_id: workspace.workspace_id,
        wallet_address: auth.session.walletAddress,
        policy_id: policyId,
        policy_version: sandboxPolicy.policy_version,
        presentation_method_id: methodId,
        evidence_hash: evidenceHash,
        expires_at: expiresAt,
        sandbox_labeled: true,
        production_trusted: false,
      });
    } catch (error) {
      const mapped = mapEphemeralStoreError(error);
      if (mapped) return mapped;
      throw error;
    }
    return NextResponse.json({
      ok: true,
      test_only: true,
      production_usable: false,
      sandbox_labeled: true,
      presentation_method_id: methodId,
      presentation_commit_id: commitId,
      presentation_commit_expires_at: expiresAt,
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
