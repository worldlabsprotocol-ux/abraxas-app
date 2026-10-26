// FILE: app/api/v1/partner-flow/trust-execution/authorize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { authorizePartnerTrustExecution } from "@/lib/partner/trustExecution/partnerTrustExecutionService";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  let body: { challenge_id?: string; signature?: string; solana_network?: string };
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
    const result = await authorizePartnerTrustExecution({
      challengeId,
      walletAddress: auth.session.walletAddress,
      signature,
      solanaNetwork: String(body.solana_network ?? auth.session.solanaNetwork),
    });
    if (!result.ok) {
      const status =
        result.code === "replay" ? 409
        : result.code === "expired" ? 410
        : result.code === "invalid_signature" ? 401
        : 403;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }
    return NextResponse.json({
      ok: true,
      authorization_ref: result.authorization_ref,
      correlation_id: result.correlation_id,
      status: "approved",
    });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 503 });
    }
    throw error;
  }
}
