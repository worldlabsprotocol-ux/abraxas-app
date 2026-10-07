// FILE: app/api/launchpad/applications/[id]/integration-health/route.ts
// Partner Launchpad operational integration health.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getLaunchpadWebhookOverview } from "@/lib/partner/eventDelivery/launchpadWebhook";
import {
  buildIntegrationOperationalHealth,
  integrationObservabilityLeaks,
  loadIntegrationEventsForApplication,
  INTEGRATION_OBSERVABILITY_NOTICE,
} from "@/lib/partner/integrationObservability";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{  id: string  }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/integration-health", auth.session.partnerId, 30);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(routeParams.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const sb = requireSupabaseAdmin();
  let productionKeyRevoked = false;
  if (app.production_api_key_id) {
    const { data: key } = await sb
      .from("partner_api_keys")
      .select("revoked_at")
      .eq("id", app.production_api_key_id)
      .maybeSingle();
    productionKeyRevoked = Boolean(key?.revoked_at);
  }

  const webhook = await getLaunchpadWebhookOverview({
    partnerId: auth.session.partnerId,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    callbackConfigured: app.allowed_return_urls.some((url) => url.startsWith("https://")),
  });

  const events = await loadIntegrationEventsForApplication({
    partnerId: auth.session.partnerId,
    applicationId: app.id,
  });

  const health = await buildIntegrationOperationalHealth({
    application: app,
    events,
    productionKeyRevoked,
    webhookConfigured: webhook.webhook_configured,
    webhookDegraded: webhook.delivery_failure_blocker,
  });

  const payload = { ok: true, notice: INTEGRATION_OBSERVABILITY_NOTICE, ...health };
  if (integrationObservabilityLeaks(payload).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  }
  return launchpadJson(payload);
}
