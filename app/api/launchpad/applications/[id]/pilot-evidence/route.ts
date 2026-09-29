// FILE: app/api/launchpad/applications/[id]/pilot-evidence/route.ts
// Partner Launchpad integration performance / pilot evidence.

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
import { loadPartnerPilotSummary, parsePilotTimeWindow } from "@/lib/partner/pilotEvidence/loadContext";
import { pilotEvidenceLeaks, PILOT_EVIDENCE_NOTICE } from "@/lib/partner/pilotEvidence";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(req, "/api/launchpad/pilot-evidence", auth.session.partnerId, 30);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const { from, to, environment: envParam } = parsePilotTimeWindow(req.nextUrl.searchParams);
  const environment = envParam ?? app.environment;

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

  const summary = await loadPartnerPilotSummary({
    application: app,
    environment,
    from,
    to,
    productionKeyRevoked,
    webhookConfigured: webhook.webhook_configured,
    webhookDegraded: webhook.delivery_failure_blocker,
  });

  const payload = { ok: true, notice: PILOT_EVIDENCE_NOTICE, performance: summary };
  if (pilotEvidenceLeaks(payload).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  }
  return launchpadJson(payload);
}
