// FILE: app/api/launchpad/applications/[id]/integration-handoff/route.ts
// External partner integration handoff surface. No secrets, no raw callbacks.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { buildIntegrationHandoff, integrationHandoffLeaks } from "@/lib/partner/productionIntegration/integrationHandoff";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = await enforceLaunchpadRateLimit(req, "/api/launchpad/integration-handoff", 30);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let productionKeyRevoked = false;
  if (app.production_api_key_id) {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_api_keys")
      .select("revoked_at")
      .eq("id", app.production_api_key_id)
      .maybeSingle();
    productionKeyRevoked = Boolean(data?.revoked_at);
  }

  const bindingId = req.nextUrl.searchParams.get("binding_id")?.trim() || null;
  const handoff = await buildIntegrationHandoff({
    application: app,
    partnerId: auth.session.partnerId,
    bindingId,
    productionKeyRevoked,
    webhookRequired: false,
  });

  const leaks = integrationHandoffLeaks(handoff);
  if (leaks.length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 500, "handoff_leak");
  }

  return launchpadJson({ ok: true, handoff });
}
