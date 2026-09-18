// FILE: app/api/launchpad/applications/[id]/webhooks/rotate/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { rotateLaunchpadWebhookSecret } from "@/lib/partner/eventDelivery/launchpadWebhook";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/webhooks/rotate", 5);
  if (limited) return limited;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const result = await rotateLaunchpadWebhookSecret(auth.session.partnerId);
  if (!result.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, result.error);
  }
  return launchpadJson({
    ok: true,
    signing_secret: result.signing_secret,
    prefix: result.prefix,
    notice: result.notice,
    secret_shown_once: true,
  });
}
