// FILE: app/api/developers/integration-studio/policy-fit/route.ts
// Public structured pack matching. Catalog remains authoritative.

import { NextRequest, NextResponse } from "next/server";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { POLICY_FIT_API_PATH, policyFitPublicChoices } from "@/lib/partner/integrationStudio/policyFit/contract";
import { matchPolicyFit, parsePolicyFitInput, policyFitViewLeaks } from "@/lib/partner/integrationStudio/policyFit/match";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, choices: policyFitPublicChoices() }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const limited = checkLaunchpadRateLimit(req, POLICY_FIT_API_PATH, 30);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "unknown_input" }, { status: 400 });
  }

  const parsed = parsePolicyFitInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const view = matchPolicyFit(parsed.intent);
  if (policyFitViewLeaks(view).length > 0) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
}
