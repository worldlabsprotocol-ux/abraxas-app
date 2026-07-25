// FILE: app/api/verify/layer/route.ts
// Verification layer status — seven items with progress.

import { NextResponse } from "next/server";
import { getVerificationLayerStatus } from "@/lib/authenticationProof/verificationLayerStatus";
import { verificationLayerProgress } from "@/lib/authenticationProof/verificationLayerProgress";
import { runE2eVerificationCheck } from "@/lib/authenticationProof/runE2eVerificationCheck";

export const dynamic = "force-dynamic";

export async function GET() {
  const [layer, e2e] = await Promise.all([
    getVerificationLayerStatus(),
    runE2eVerificationCheck(),
  ]);

  const progress = verificationLayerProgress(layer);

  return NextResponse.json({
    ...layer,
    progress,
    e2e: {
      ok: e2e.ok,
      summary: e2e.summary,
      fully_live: e2e.signing_configured && e2e.verification_key_configured && e2e.supabase_configured && e2e.ok,
      steps: e2e.steps,
      blockers: e2e.blockers,
      production_reference: e2e.production_reference,
    },
    endpoints: {
      e2e_check: "/api/verify/e2e",
      proof_loop: "/api/proof/loop",
      credentials_verify: "/api/credentials/verify",
      proof_lookup: "/api/proof/[id]",
      asset_monitoring_preview: "/api/asset-monitoring/preview?asset_id=ABX-RE-HOSP-001",
    },
  });
}
