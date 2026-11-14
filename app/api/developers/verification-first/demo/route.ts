// FILE: app/api/developers/verification-first/demo/route.ts
// Read-only non-production bundle metadata for institutional onboarding (no auth).

import { NextResponse } from "next/server";
import {
  VERIFICATION_FIRST_JOURNEY_STEPS,
  verificationFirstDemoBundleDownloadHints,
  verificationFirstDemoManifest,
} from "@/lib/partner/portableIndependentVerification/integrationFirstDemonstration";

export const dynamic = "force-static";

export async function GET() {
  const manifest = verificationFirstDemoManifest();
  return NextResponse.json({
    ok: true,
    adoption_mode: "verification_first",
    issuance_note:
      "Live issuance still requires an authorized issuer. This response ships synthetic sandbox fixtures for independent verification onboarding only.",
    status_snapshot_note:
      "A signed status statement proves what the signer asserted at statement time. Your verifier must enforce freshness, revocation, and policy — not treat a snapshot as indefinite live validity.",
    manifest,
    journey_steps: VERIFICATION_FIRST_JOURNEY_STEPS,
    download_hints: verificationFirstDemoBundleDownloadHints(),
    interactive_scenarios: ["valid", "wrong_audience", "revoked"],
    verify_post_path: "/api/developers/verification-first/verify",
    workspace_path: "/verify?mode=independent",
  });
}