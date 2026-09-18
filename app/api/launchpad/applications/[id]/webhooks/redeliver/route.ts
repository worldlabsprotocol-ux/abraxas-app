// FILE: app/api/launchpad/applications/[id]/webhooks/redeliver/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { redeliverLaunchpadWebhook } from "@/lib/partner/eventDelivery/launchpadWebhook";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/webhooks/redeliver", 10);
  if (limited) return limited;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const body = await req.json().catch(() => ({})) as { outbox_id?: string };
  if (!body.outbox_id?.trim()) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "outbox_id required");
  }

  const result = await redeliverLaunchpadWebhook({
    partnerId: auth.session.partnerId,
    outboxId: body.outbox_id.trim(),
  });
  if (!result.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, result.error);
  }
  return launchpadJson({
    ok: true,
    event_id: result.event_id,
    notice: "Same event ID requeued. No new receipt was created. Delivery remains best effort.",
  });
}
