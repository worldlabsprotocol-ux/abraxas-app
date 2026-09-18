// FILE: app/api/launchpad/applications/[id]/integration-docs/route.ts

import { NextRequest } from "next/server";
import {
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { buildLaunchpadIntegrationDocs } from "@/lib/partner/launchpad/integrationDocs";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }

  const sb = requireSupabaseAdmin();
  let keyPrefix: string | null = null;
  if (app.api_key_id) {
    const { data: key } = await sb
      .from("partner_api_keys")
      .select("key_prefix, revoked_at")
      .eq("id", app.api_key_id)
      .maybeSingle();
    if (key && !key.revoked_at) keyPrefix = key.key_prefix;
  }

  const docs = buildLaunchpadIntegrationDocs(app, keyPrefix);
  return launchpadJson({ ok: true, docs });
}
