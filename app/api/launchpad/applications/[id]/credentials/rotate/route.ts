// FILE: app/api/launchpad/applications/[id]/credentials/rotate/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { rotateLaunchpadCredential } from "@/lib/partner/launchpad/credentialOps";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import {
  attachPartnerConsoleSessionCookie,
  issuePartnerConsoleSessionToken,
} from "@/lib/partner/launchpad/partnerConsoleSession";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/credentials/rotate", 10);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const result = await rotateLaunchpadCredential(params.id, auth.session.partnerId);
  if (!result.ok) {
    if (result.code === "not_found") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
    }
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.credential_rotate_failed, 500);
  }

  const res = launchpadJson({
    ok: true,
    api_key: result.api_key,
    key_prefix: result.key_prefix,
  });

  const token = await issuePartnerConsoleSessionToken({
    partnerId: auth.session.partnerId,
    apiKeyId: result.api_key_id,
    environment: auth.session.environment,
  });
  if (token) attachPartnerConsoleSessionCookie(res, token);

  return res;
}
