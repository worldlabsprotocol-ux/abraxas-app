// FILE: app/api/auth/wallet/sandbox/recognized-issuer/evaluate/route.ts
// Evaluates holder-presented recognized issuer credentials (no policy execution).

import { NextRequest, NextResponse } from "next/server";
import {
  assertPassportWalletSameOriginRequest,
  resolvePassportWalletRequestOrigin,
} from "@/lib/auth/passportWalletAuth/origin";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import { evaluateEphemeralRecognizedIssuerPresentation } from "@/lib/protocolVerification/ephemeralRecognizedIssuerPresentation.server";
import { resolveSandboxPolicyAvailability } from "@/lib/auth/ephemeralWallet/sandboxPolicyAvailability.server";

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

  let body: {
    policy_id?: string;
    credential?: SignedPassportReusableCredential;
    portable_revocation_snapshot?: PortableRevocationSignedArtifact;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const policyId = String(body.policy_id ?? "").trim();
  if (!policyId || !body.credential || !body.portable_revocation_snapshot) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const availability = resolveSandboxPolicyAvailability(policyId);
  if (policyId === "age_21_retail" && availability?.age_experience !== "age_21_test") {
    return NextResponse.json(
      {
        ok: false,
        code: "genuine_age_evidence_unavailable",
        message:
          "Real age eligibility requires recognized issuer credentials via Passport presentation. Sandbox demonstration uses the authorized test issuer path only.",
      },
      { status: 422 },
    );
  }

  const evaluated = await evaluateEphemeralRecognizedIssuerPresentation({
    credential: body.credential,
    portable_revocation_snapshot: body.portable_revocation_snapshot,
    walletAddress: auth.session.walletAddress,
    policyId,
    context: "sandbox_only",
  });

  if (!evaluated.ok) {
    return NextResponse.json(
      { ok: false, code: evaluated.code, unsupported: evaluated.unsupported ?? false },
      { status: evaluated.unsupported ? 422 : 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    issuer_id: evaluated.issuer_id,
    sandbox_labeled: evaluated.sandbox_labeled,
    claim_count: evaluated.materialized_claims.length,
    production_usable: false,
    test_only: true,
  });
}
