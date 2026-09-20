// FILE: app/api/launchpad/applications/[id]/webhook-delivery-health/route.ts
// Read-only Launchpad webhook health. Does not send webhooks.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { loadWebhookDeliveryHealth } from "@/lib/partner/launchpad/webhookDeliveryHealth/load";
import { webhookHealthCopyLeaks } from "@/lib/partner/launchpad/webhookDeliveryHealth/classify";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/webhook-delivery-health",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const clientPartner = req.nextUrl.searchParams.get("partner_id");
  const clientApp = req.nextUrl.searchParams.get("application_id");
  if (
    (clientPartner && clientPartner !== auth.session.partnerId)
    || (clientApp && clientApp !== params.id)
  ) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403);
  }

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  try {
    const view = await loadWebhookDeliveryHealth({
      application: app,
      partnerId: auth.session.partnerId,
    });
    const serialized = JSON.stringify(view);
    if (webhookHealthCopyLeaks(serialized).length > 0) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 503, "redacted");
    }
    return launchpadJson({ ok: true, ...view });
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503, "unavailable");
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  void params;
  void req;
  return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 405, "read_only");
}
