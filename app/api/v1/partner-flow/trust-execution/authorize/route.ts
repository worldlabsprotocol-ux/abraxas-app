// FILE: app/api/v1/partner-flow/trust-execution/authorize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { authorizePartnerTrustExecutionAndContinue } from "@/lib/partner/trustExecution/partnerTrustExecutionJourney";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: {
    challenge_id?: string;
    signature?: string;
    solana_network?: string;
    continue_evaluation?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const challengeId = String(body.challenge_id ?? "").trim();
  const signature = String(body.signature ?? "").trim();
  if (!challengeId || !signature) {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  try {
    const result = await authorizePartnerTrustExecutionAndContinue({
      challengeId,
      walletAddress: auth.session.walletAddress,
      signature,
      solanaNetwork: String(body.solana_network ?? auth.session.solanaNetwork),
      continueEvaluation: body.continue_evaluation !== false,
    });
    if (!result.ok) {
      const status =
        result.code === "replay" ? 409
        : result.code === "expired" ? 410
        : result.code === "invalid_signature" ? 401
        : 403;
      return NextResponse.json({ ok: false, code: result.code, phase: result.phase }, { status });
    }
    const execution = result.execution;
    return NextResponse.json({
      ok: true,
      authorization_ref: result.authorization_ref,
      correlation_id: result.correlation_id,
      status: "approved",
      evaluation_continued: result.evaluation_continued,
      execution: execution
        ? {
            ok: execution.ok,
            code: execution.ok ? undefined : execution.code,
            decision_result: execution.ok ? execution.journey.decision_result : execution.decision_result,
            receipt_id: execution.ok ? execution.journey.receipt_id : null,
            evidence_mode: execution.ok ? execution.journey.evidence_mode : null,
            independent_verification_material: execution.ok
              ? execution.journey.independent_verification_material
              : null,
          }
        : null,
      relying_party_note:
        "Wallet authorization permits evaluation only. Verify portable receipt material with your pinned trust anchor.",
    });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 503 });
    }
    throw error;
  }
}
