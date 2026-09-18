// FILE: app/api/launchpad/applications/[id]/health/route.ts

import { NextRequest } from "next/server";
import { launchpadError, launchpadJson, requireLaunchpadSession } from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { buildLaunchpadIntegrationHealth } from "@/lib/partner/launchpad/integrationHealth";
import { getLaunchpadWebhookOverview } from "@/lib/partner/eventDelivery/launchpadWebhook";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { harnessPassedFromActivity } from "@/lib/partner/launchpad/partnerTestHarness";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const sb = requireSupabaseAdmin();
  const keyIds = [app.api_key_id, app.production_api_key_id].filter(Boolean) as string[];
  const { data: keys } = keyIds.length
    ? await sb.from("partner_api_keys").select("id, revoked_at").in("id", keyIds)
    : { data: [] as Array<{ id: string; revoked_at: string | null }> };
  const { data: domains } = await sb.from("partner_launchpad_domain_verifications")
    .select("hostname").eq("application_id", app.id).eq("partner_id", auth.session.partnerId).eq("status", "verified");
  const { data: activity } = await sb.from("partner_launchpad_activity")
    .select("event_type, public_code, metadata")
    .eq("application_id", app.id)
    .eq("partner_id", auth.session.partnerId)
    .limit(200);
  const harness = harnessPassedFromActivity((activity ?? []) as Array<{
    event_type: string;
    public_code: string | null;
    metadata?: Record<string, unknown>;
  }>);
  const active = new Set((keys ?? []).filter((key) => !key.revoked_at).map((key) => key.id));
  const webhook = await getLaunchpadWebhookOverview({
    partnerId: auth.session.partnerId,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    callbackConfigured: hasProductionLaunchpadCallback(app.allowed_return_urls),
  });
  return launchpadJson(buildLaunchpadIntegrationHealth({
    application: app,
    activeSandboxKey: Boolean(app.api_key_id && active.has(app.api_key_id)),
    activeProductionKey: Boolean(app.production_api_key_id && active.has(app.production_api_key_id)),
    verifiedHostnames: (domains ?? []).map((domain) => String(domain.hostname)),
    harnessCompleted: harness.completed,
    webhookConfigured: webhook.webhook_configured,
    webhookEnabled: webhook.webhook_enabled,
    signingSecretAvailable: webhook.signing_secret_available,
    latestDeliveryStatus: webhook.latest_delivery_status,
    deliveryFailureBlocker: webhook.delivery_failure_blocker,
  }));
}
