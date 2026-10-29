// FILE: app/api/developers/integration-studio/external-integration-state/route.ts
// Server-derived builder integration finish line (integration events only).

import { NextRequest, NextResponse } from "next/server";
import { deriveBuilderIntegrationAcceptance } from "@/lib/developers/builderExternalIntegrationAcceptance";
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

  const events = await loadIntegrationEventsForApplication({
    partnerId: session.partnerId,
    applicationId: app.id,
    limit: 200,
  });

  const integrationFilesReady = req.nextUrl.searchParams.get("files_ready") === "1";
  const serverSetupAcknowledged = req.nextUrl.searchParams.get("server_ack") === "1";
  const sandboxHarnessSucceeded = req.nextUrl.searchParams.get("harness_ok") === "1";

  const acceptance = deriveBuilderIntegrationAcceptance({
    sandboxHarnessSucceeded,
    integrationFilesReady,
    serverSetupAcknowledged,
    events,
  });

  return NextResponse.json({
    ok: true,
    application_id: app.id,
    acceptance,
  });
}
