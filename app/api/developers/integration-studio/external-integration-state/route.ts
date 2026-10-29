// FILE: app/api/developers/integration-studio/external-integration-state/route.ts
// Server-derived builder integration state — read-only; never fabricates evidence.

import { NextRequest, NextResponse } from "next/server";
import { deriveBuilderIntegrationAcceptance } from "@/lib/developers/builderExternalIntegrationAcceptance";
import { correlateBuilderEnforcementReceipts } from "@/lib/developers/builderEnforcementCorrelation";
import { verifyBuilderEnforcementReceipt } from "@/lib/developers/verifyBuilderEnforcementReceipt.server";
import { loadIntegrationEventsForApplication } from "@/lib/partner/integrationObservability/load";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await resolvePartnerConsoleSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const applicationId = (req.nextUrl.searchParams.get("application_id") ?? "").trim();
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const app = await getLaunchpadApplicationForPartner(applicationId, session.partnerId);
  if (!app) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const bind = {
    partnerId: session.partnerId,
    applicationId: app.id,
    policyId: app.policy_id,
  };

  const events = await loadIntegrationEventsForApplication({
    partnerId: session.partnerId,
    applicationId: app.id,
    limit: 200,
  });

  const correlated = correlateBuilderEnforcementReceipts(events, bind);
  const receiptIdsToVerify = correlated
    .filter((chain) => chain.correlated_permit_chain || chain.correlated_deny_chain)
    .map((chain) => chain.receipt_id)
    .slice(0, 5);

  const platformVerifications = await Promise.all(
    receiptIdsToVerify.map((receiptId) =>
      verifyBuilderEnforcementReceipt({
        receiptId,
        partnerId: bind.partnerId,
        policyId: bind.policyId,
      }),
    ),
  );

  const sandboxHarnessSucceeded = req.nextUrl.searchParams.get("harness_ok") === "1";

  const acceptance = deriveBuilderIntegrationAcceptance({
    sandboxHarnessSucceeded,
    events,
    bind,
    platformVerifications,
  });

  return NextResponse.json({
    ok: true,
    application_id: app.id,
    policy_id: app.policy_id,
    acceptance,
    evidence_notice:
      "Integration events are partner-reported telemetry. Completion requires correlated events and platform independent verification of the bound receipt.",
  });
}
