// FILE: app/api/launchpad/applications/[id]/production-access/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/production-access", 5);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }
  if (!hasProductionLaunchpadCallback(app.allowed_return_urls)) {
    return launchpadError(
      LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected,
      400,
      "production_https_callback_required",
    );
  }

  let body: { request_notes?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("partner_production_access_requests")
    .insert({
      application_id: params.id,
      partner_id: auth.session.partnerId,
      request_notes: body.request_notes?.trim() || null,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.production_request_failed, 500);
  }

  await recordLaunchpadActivity(sb, {
    applicationId: params.id,
    partnerId: auth.session.partnerId,
    eventType: "production_access_requested",
    publicCode: "pending",
  });

  return launchpadJson({ ok: true, request: data });
}
