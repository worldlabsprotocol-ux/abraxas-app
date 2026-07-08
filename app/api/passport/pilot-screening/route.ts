// FILE: app/api/passport/pilot-screening/route.ts
// Pilot: apply screening_outcome=clear for Tier 3 testing (session auth).

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { applyScreeningClear } from "@/lib/screening/applyScreeningOutcome";
import { getTrustStatus } from "@/lib/trust/getTrustStatus";

function pilotScreeningEnabled(): boolean {
  if (process.env.PILOT_TIER3_SCREENING === "true") return true;
  if (process.env.PILOT_TIER3_SCREENING === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function POST(req: NextRequest) {
  if (!pilotScreeningEnabled()) {
    return NextResponse.json({ error: "Pilot screening not enabled" }, { status: 403 });
  }

  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const trust = await getTrustStatus(session.session.suiAddress);
  if (!trust?.enhanced_trust) {
    return NextResponse.json({
      error: "Identity verification required before pilot screening",
    }, { status: 400 });
  }

  try {
    await applyScreeningClear({
      subjectId: session.session.suiAddress,
      providerRef: `pilot:self-service:${Date.now()}`,
      jurisdiction: undefined,
      ttlHours: 24,
    });
    return NextResponse.json({
      ok: true,
      screening_outcome: "clear",
      message: "Pilot screening claim issued — Tier 3 eligibility may now be active.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Screening failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
