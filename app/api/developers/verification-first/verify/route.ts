// FILE: app/api/developers/verification-first/verify/route.ts

import { NextResponse } from "next/server";
import {
  runVerificationFirstDemoScenario,
  VERIFICATION_FIRST_DEMO_SCENARIOS,
  type VerificationFirstDemoScenario,
} from "@/lib/partner/portableIndependentVerification/integrationFirstDemonstration";

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
  return NextResponse.json({ ok: true, ...result });
}