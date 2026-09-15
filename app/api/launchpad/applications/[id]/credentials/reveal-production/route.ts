// FILE: app/api/launchpad/applications/[id]/credentials/reveal-production/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { revealProductionCredentialOnce } from "@/lib/partner/launchpad/productionApproval";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/credentials/reveal-production", 5);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const result = await revealProductionCredentialOnce(params.id, auth.session.partnerId);
  if (!result.ok) {
    if (result.code === "not_ready") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "production_key_not_ready");
    }
    if (result.code === "not_configured") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503);
    }
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.credential_rotate_failed, 500);
  }

  if (!("api_key" in result)) {
    return launchpadJson({ ok: true, already_revealed: true });
  }

  return launchpadJson({
    ok: true,
    api_key: result.api_key,
    key_prefix: result.key_prefix,
    already_revealed: false,
  });
}
