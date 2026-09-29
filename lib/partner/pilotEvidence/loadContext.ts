// FILE: lib/partner/pilotEvidence/loadContext.ts
// Assemble events, activity, and health for pilot evidence.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { buildIntegrationOperationalHealth } from "@/lib/partner/integrationObservability/health";
import { loadIntegrationEvents, loadLaunchpadActivity } from "./load";
import { buildPartnerPilotSummary } from "./summary";
import type { PartnerPilotSummary, PilotEnvironment } from "./contract";

export function parsePilotTimeWindow(searchParams: URLSearchParams): {
  from: Date | null;
  to: Date | null;
  environment: PilotEnvironment | null;
} {
  const fromRaw = searchParams.get("from")?.trim();
  const toRaw = searchParams.get("to")?.trim();
  const envRaw = searchParams.get("environment")?.trim();
  const environment = envRaw === "production" || envRaw === "sandbox" ? envRaw : null;
  const from = fromRaw ? new Date(fromRaw) : null;
  const to = toRaw ? new Date(toRaw) : null;
  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null,
    environment,
  };
}

export async function loadPartnerPilotSummary(input: {
  application: LaunchpadApplicationRow;
  environment: PilotEnvironment;
  from?: Date | null;
  to?: Date | null;
  productionKeyRevoked?: boolean;
  webhookConfigured?: boolean;
  webhookDegraded?: boolean;
}): Promise<PartnerPilotSummary> {
  const events = await loadIntegrationEvents({
    partnerId: input.application.partner_id,
    applicationId: input.application.id,
    environment: input.environment,
    from: input.from,
    to: input.to,
  });
  const activity = await loadLaunchpadActivity({
    partnerId: input.application.partner_id,
    applicationId: input.application.id,
    from: input.from,
    to: input.to,
  });
  const health = await buildIntegrationOperationalHealth({
    application: input.application,
    events,
    productionKeyRevoked: input.productionKeyRevoked,
    webhookConfigured: input.webhookConfigured,
    webhookDegraded: input.webhookDegraded,
  });
  return buildPartnerPilotSummary({
    application: input.application,
    events,
    activity,
    environment: input.environment,
    from: input.from,
    to: input.to,
    health,
    webhookStatus: health.webhook_status,
  });
}
