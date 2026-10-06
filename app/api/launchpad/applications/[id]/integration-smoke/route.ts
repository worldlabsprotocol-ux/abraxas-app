// FILE: app/api/launchpad/applications/[id]/integration-smoke/route.ts

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
import { runIntegrationSmokeTest } from "@/lib/partner/integrationObservability";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/integration-smoke", auth.session.partnerId, 6);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let productionKeyRevoked = false;
  if (app.production_api_key_id) {
    const sb = requireSupabaseAdmin();
    const { data: key } = await sb
      .from("partner_api_keys")
      .select("revoked_at")
      .eq("id", app.production_api_key_id)
      .maybeSingle();
    productionKeyRevoked = Boolean(key?.revoked_at);
  }

  const result = await runIntegrationSmokeTest({
    application: app,
    partnerId: auth.session.partnerId,
    productionKeyRevoked,
  });
  return launchpadJson({ ...result } as Record<string, unknown>);
}
