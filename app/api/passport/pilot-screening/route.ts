// FILE: app/api/passport/pilot-screening/route.ts
// Sandbox demo: apply clearly labeled screening_outcome for Tier 3 testing (session auth).

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { applySandboxScreeningClear } from "@/lib/screening/applySandboxScreeningOutcome";
import { getTrustStatus } from "@/lib/trust/getTrustStatus";
import { SANDBOX_DISCLAIMER } from "@/lib/credentials/sandboxClaims";

function pilotScreeningEnabled(): boolean {
  if (process.env.PILOT_TIER3_SCREENING === "true") return true;
  if (process.env.PILOT_TIER3_SCREENING === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function POST(req: NextRequest) {
  if (!pilotScreeningEnabled()) {
    return NextResponse.json({ error: "Sandbox demo screening not enabled" }, { status: 403 });
  }

  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const trust = await getTrustStatus(session.session.suiAddress);
  if (!trust?.enhanced_trust) {
    return NextResponse.json({
      error: "Identity verification required before sandbox demo screening",
    }, { status: 400 });
  }

  try {
    const result = await applySandboxScreeningClear({
      subjectId: session.session.suiAddress,
      ttlHours: 24,
    });
    return NextResponse.json({
      ok: true,
      screening_outcome: "clear",
      environment: "sandbox",
      status: "demo",
      non_reliance: true,
      issuer: "Abraxas Sandbox",
      expires_at: result.expires_at,
      created_at: result.created_at,
      disclaimer: SANDBOX_DISCLAIMER,
      message: "Sandbox demo screening claim issued — not a real sanctions or AML clearance.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Screening failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
