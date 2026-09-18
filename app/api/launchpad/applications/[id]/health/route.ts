// FILE: app/api/launchpad/applications/[id]/health/route.ts

import { NextRequest } from "next/server";
import { launchpadError, launchpadJson, requireLaunchpadSession } from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { buildLaunchpadIntegrationHealth } from "@/lib/partner/launchpad/integrationHealth";
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
  const active = new Set((keys ?? []).filter((key) => !key.revoked_at).map((key) => key.id));
  return launchpadJson(buildLaunchpadIntegrationHealth({
    application: app,
    activeSandboxKey: Boolean(app.api_key_id && active.has(app.api_key_id)),
    activeProductionKey: Boolean(app.production_api_key_id && active.has(app.production_api_key_id)),
    verifiedHostnames: (domains ?? []).map((domain) => String(domain.hostname)),
  }));
}
