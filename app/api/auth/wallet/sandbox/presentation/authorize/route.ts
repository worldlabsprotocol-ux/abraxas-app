// FILE: app/api/auth/wallet/sandbox/presentation/authorize/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { enforceNativeAuthRateLimit } from "@/lib/auth/nativeAccount/rateLimit";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { getEphemeralSandboxForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import {
  markSandboxPresentationCommitPossessionAuthorized,
  peekSandboxPresentationCommit,
} from "@/lib/auth/ephemeralWallet/sandboxPresentationCommitStore";
import type { HolderPossessionProof, PassportPossessionChallengePayload } from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import { verifySandboxPresentationPossessionAuthorization } from "@/lib/protocolVerification/sandboxPresentationPossession.server";
import { verifySandboxPresentationCommitAgainstSubmission } from "@/lib/protocolVerification/verifySandboxPresentationCommit";
import { resolveEphemeralSandboxTestPolicy } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestOrigin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, requestOrigin)) {
    return NextResponse.json({ ok: false, code: "wrong_origin" }, { status: 403 });
  }

  const limited = await enforceNativeAuthRateLimit(req, "ephemeral_sandbox_presentation_authorize", 25);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: {
    presentation_commit_id?: string;
    policy_id?: string;
    challenge?: PassportPossessionChallengePayload;
    holder_possession_proof?: HolderPossessionProof;
    evidence?: {
      kind?: string;
      credential?: SignedPassportReusableCredential;
      portable_revocation_snapshot?: PortableRevocationSignedArtifact;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const commitId = String(body.presentation_commit_id ?? "").trim();
  const policyId = String(body.policy_id ?? "").trim();
  if (!commitId || !policyId || !body.challenge || !body.holder_possession_proof) {
    return NextResponse.json({ ok: false, code: "presentation_authorization_incomplete" }, { status: 400 });
  }
  if (body.evidence?.kind !== "passport_reusable_credential" || !body.evidence.credential || !body.evidence.portable_revocation_snapshot) {
    return NextResponse.json({ ok: false, code: "credential_evidence_required" }, { status: 422 });
  }

  const workspace = await getEphemeralSandboxForSession(auth.session.sessionId);
  if (!workspace) {
    return NextResponse.json({ ok: false, code: "sandbox_workspace_required" }, { status: 400 });
  }

  const sandboxPolicy = resolveEphemeralSandboxTestPolicy(policyId);
  if (!sandboxPolicy) {
    return NextResponse.json({ ok: false, code: "invalid_policy" }, { status: 400 });
  }

  try {
    const commit = await peekSandboxPresentationCommit(commitId);
    if (!commit) {
      return NextResponse.json({ ok: false, code: "presentation_commit_not_found" }, { status: 410 });
    }

    const binding = verifySandboxPresentationCommitAgainstSubmission({
      commit,
      session_id: auth.session.sessionId,
      workspace_id: workspace.workspace_id,
      wallet_address: auth.session.walletAddress,
      policy_id: policyId,
      policy_version: sandboxPolicy.policy_version,
      credential: body.evidence.credential,
      portable_revocation_snapshot: body.evidence.portable_revocation_snapshot,
      require_possession_authorized: false,
    });
    if (!binding.ok) {
      const status =
        binding.code === "presentation_commit_not_found" || binding.code === "presentation_commit_expired"
          ? 410
          : 422;
      return NextResponse.json({ ok: false, code: binding.code }, { status });
    }

    const possession = verifySandboxPresentationPossessionAuthorization({
      commit,
      credential: body.evidence.credential,
      challenge: body.challenge,
      proof: body.holder_possession_proof,
    });
    if (!possession.ok) {
      const status = possession.code === "presentation_possession_already_authorized" ? 409 : 401;
      return NextResponse.json({ ok: false, code: possession.code }, { status });
    }

    const updated = await markSandboxPresentationCommitPossessionAuthorized(
      commitId,
      new Date().toISOString(),
    );
    if (!updated) {
      return NextResponse.json({ ok: false, code: "presentation_commit_not_found" }, { status: 410 });
    }

    return NextResponse.json({
      ok: true,
      presentation_authorized: true,
      presentation_commit_id: commitId,
      credential_id: body.evidence.credential.payload.credential_id,
      test_only: true,
      production_usable: false,
    });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
