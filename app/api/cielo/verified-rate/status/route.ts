// FILE: app/api/cielo/verified-rate/status/route.ts
// Pre-flight Passport + profile + wallet status for Cielo verified rate (session auth).

import { NextRequest, NextResponse } from "next/server";
import { evaluateCieloVerifiedGuest } from "@/lib/cielo/verifiedGuestPolicy";
import { evaluateCieloVerifiedGuestSolana } from "@/lib/cielo/verifiedGuestSolanaPolicy";
import { parseVerifiedRateFixture } from "@/lib/cielo/verifiedRateFixtures";
import { requireCieloHolderContext } from "@/lib/cielo/cieloHolderRequestContext";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCieloHolderContext(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const fixture = parseVerifiedRateFixture(req.nextUrl.searchParams.get("fixture"));
  const evaluation = auth.ctx.mode === "solana_native"
    ? await evaluateCieloVerifiedGuestSolana({
      holderAccountId: auth.ctx.holderAccountId,
      claimsSubjectKey: auth.ctx.claimsSubjectKey,
      solanaAddress: auth.ctx.solanaAddress,
      requireConsent: false,
    })
    : await evaluateCieloVerifiedGuest(auth.ctx.suiAddress, {
      requireConsent: false,
      fixture,
    });

  return NextResponse.json({
    ok: true,
    evaluation,
    policy_id: auth.ctx.policyId,
    auth_mode: auth.ctx.mode,
  });
}
