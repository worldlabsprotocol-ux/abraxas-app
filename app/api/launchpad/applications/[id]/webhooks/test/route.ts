// FILE: app/api/launchpad/applications/[id]/webhooks/test/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { enqueueLaunchpadWebhookTest } from "@/lib/partner/eventDelivery/launchpadWebhook";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";
import { toLaunchpadWebhookPublicFailureCode } from "@/lib/partner/eventDelivery/publicFailure";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/webhooks/test", 6);
  if (limited) return limited;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const result = await enqueueLaunchpadWebhookTest(auth.session.partnerId);
  if (!result.ok) {
    const code = toLaunchpadWebhookPublicFailureCode(result.code);
    return launchpadError(code, 400, code);
  }
  return launchpadJson({
    ok: true,
    queued: true,
    event_id: result.eventId,
    event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE,
    label: "TEST EVENT",
    notice: "This is a labeled test event. Queued means accepted for best-effort delivery, not receipt authorization.",
  });
}
