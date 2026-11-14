// FILE: app/api/developers/verification-first/verify/route.ts

import { NextResponse } from "next/server";
import {
  runVerificationFirstDemoScenario,
  verificationFirstDemoManifest,
  VERIFICATION_FIRST_DEMO_SCENARIOS,
  type VerificationFirstDemoScenario,
} from "@/lib/partner/portableIndependentVerification/integrationFirstDemonstration";
import { buildDefaultResultRows } from "@/lib/partner/portableIndependentVerification/plainVerificationSummary";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const scenario = (body as { scenario?: string }).scenario;
  if (!scenario || !VERIFICATION_FIRST_DEMO_SCENARIOS.includes(scenario as VerificationFirstDemoScenario)) {
    return NextResponse.json(
      { ok: false, error: "invalid_scenario", allowed: VERIFICATION_FIRST_DEMO_SCENARIOS },
      { status: 400 },
    );
  }
  const result = runVerificationFirstDemoScenario(scenario as VerificationFirstDemoScenario);
  const manifest = verificationFirstDemoManifest();
  const plain = buildDefaultResultRows({
    verification: result.verification,
    mode: "hosted_demo_fixture",
    scenario,
    policy_id: manifest.policy_id,
    partner_id: manifest.partner_id,
    receipt_id: manifest.receipt_id,
    isSyntheticDemo: true,
    decisionResult: "approved",
  });
  return NextResponse.json({
    ok: true,
    ...result,
    plain,
    offline_verification_note:
      "Full independent verification runs offline with @abraxas/independent-verifier and a trust anchor pinned out-of-band.",
  });
}