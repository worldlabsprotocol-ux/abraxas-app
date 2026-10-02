// FILE: app/api/launchpad/applications/[id]/activation/route.ts
// Backend-derived developer activation, summary, metrics, and health.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { loadIntegrationEventsForApplication } from "@/lib/partner/integrationObservability";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildDeveloperIntegrationHealth,
  buildDeveloperIntegrationSummary,
  computeDeveloperTimeToProofMetrics,
  deriveDeveloperActivation,
  listDeveloperErrorRemediation,
} from "@/lib/partner/externalActivation";
import { loadStarterKitEvidenced } from "@/lib/partner/launchpad/partnerFlowRequest";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/activation", auth.session.partnerId, 30);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const sb = requireSupabaseAdmin();
  let keyPrefix: string | null = null;
  if (app.api_key_id) {
    const { data: key } = await sb.from("partner_api_keys").select("key_prefix").eq("id", app.api_key_id).maybeSingle();
    keyPrefix = (key?.key_prefix as string | undefined) ?? null;
  }

  const events = await loadIntegrationEventsForApplication({
    partnerId: auth.session.partnerId,
    applicationId: app.id,
  });

  let activityRows: Array<{ event_type?: string; public_code?: string | null; created_at?: string; metadata?: Record<string, unknown> }> = [];
  try {
    const { data } = await sb
      .from("partner_launchpad_activity")
      .select("event_type, public_code, created_at, metadata")
      .eq("application_id", app.id)
      .eq("partner_id", auth.session.partnerId)
      .order("created_at", { ascending: false })
      .limit(80);
    activityRows = (data ?? []) as typeof activityRows;
  } catch {
    activityRows = [];
  }

  const starterKitGenerated = await loadStarterKitEvidenced(app.id, auth.session.partnerId);

  const activation = deriveDeveloperActivation({
    application: app,
    events,
    activity: activityRows,
    activeSandboxKey: Boolean(app.api_key_id),
    starterKitGenerated,
  });

  return launchpadJson({
    ok: true,
    activation,
    summary: buildDeveloperIntegrationSummary({
      application: app,
      activeSandboxKey: Boolean(app.api_key_id),
      keyPrefix,
    }),
    metrics: computeDeveloperTimeToProofMetrics({ application: app, events }),
    health: buildDeveloperIntegrationHealth({
      application: app,
      events,
      activeSandboxKey: Boolean(app.api_key_id),
    }),
    error_remediation: listDeveloperErrorRemediation(),
    operator_actions_required_for_sandbox_proof: 0,
  });
}
