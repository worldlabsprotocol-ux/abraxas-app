// FILE: app/api/launchpad/applications/[id]/activity/route.ts

import { NextRequest } from "next/server";
import {
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { projectLaunchpadActivityEvent } from "@/lib/privacy/selectiveDisclosure";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{  id: string  }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(routeParams.id, auth.session.partnerId);
  if (!app) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }

  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50));
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_activity")
    .select("id, event_type, public_code, metadata, created_at")
    .eq("application_id", routeParams.id)
    .eq("partner_id", auth.session.partnerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return launchpadJson({
    ok: true,
    events: (data ?? []).map((row) => projectLaunchpadActivityEvent(row as Record<string, unknown>)),
  });
}
