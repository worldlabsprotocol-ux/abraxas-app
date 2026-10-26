// FILE: app/api/v1/partner-flow/trust-execution/challenge/[challengeId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { getHolderTrustExecutionChallenge } from "@/lib/partner/trustExecution/partnerTrustExecutionService";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: { challengeId: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  try {
    const challenge = await getHolderTrustExecutionChallenge(params.challengeId);
    if (!challenge.ok) {
      return NextResponse.json({ ok: false, code: challenge.code }, { status: 404 });
    }
    const loaded = await import("@/lib/auth/walletAuthorization/scopedChallengePostgresStore").then((m) =>
      m.loadScopedTrustChallenge(params.challengeId),
    );
    if (loaded && loaded.walletAddress !== auth.session.walletAddress) {
      return NextResponse.json({ ok: false, code: "wrong_wallet" }, { status: 403 });
    }
    return NextResponse.json({
      ok: true,
      challenge: {
        challenge_id: challenge.challenge_id,
        message: challenge.message,
        expires_at: challenge.expires_at,
        partner_id: challenge.partner_id,
        application_id: challenge.application_id,
        policy_id: challenge.policy_id,
        action: challenge.action,
        status: challenge.status,
      },
    });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 503 });
    }
    throw error;
  }
}
