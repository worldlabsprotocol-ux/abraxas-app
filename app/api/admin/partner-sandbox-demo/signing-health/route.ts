// FILE: app/api/admin/partner-sandbox-demo/signing-health/route.ts
// Admin-only boolean diagnostics for Demo receipt signing key alignment.

import { NextRequest } from "next/server";
import {
  classifyPartnerSandboxDemoError,
  logPartnerSandboxDemoInternalError,
} from "@/lib/demo/partnerSandboxDemoErrors";
import { guardPartnerSandboxDemoRoute, partnerSandboxDemoJson } from "@/lib/demo/partnerSandboxDemoRouteGuard";
import {
  evaluateReceiptSigningHealth,
  signingHealthResponseHasNoSecrets,
} from "@/lib/decisionReceipts/signingKeyDiagnostics";

export const dynamic = "force-dynamic";

const OPERATION = "partner_sandbox_demo.signing_health";

export async function GET(req: NextRequest) {
  const blocked = guardPartnerSandboxDemoRoute(req);
  if (blocked) return blocked;

  try {
    const report = evaluateReceiptSigningHealth();
    if (!signingHealthResponseHasNoSecrets(report)) {
      throw new Error("demo_signing_health_response_unsafe");
    }
    return partnerSandboxDemoJson({
      ok: report.ok,
      signing_key_configured: report.signing_key_configured,
      signing_key_parse_ok: report.signing_key_parse_ok,
      public_key_configured: report.public_key_configured,
      public_key_parse_ok: report.public_key_parse_ok,
      seed_matches_embedded_x: report.seed_matches_embedded_x,
      seed_matches_public_env: report.seed_matches_public_env,
      receipt_env_roundtrip_ok: report.receipt_env_roundtrip_ok,
    });
  } catch (error: unknown) {
    const classified = classifyPartnerSandboxDemoError(error);
    if (classified.status === 500) {
      logPartnerSandboxDemoInternalError(OPERATION, error);
    }
    return partnerSandboxDemoJson({ error: classified.error }, { status: classified.status });
  }
}
