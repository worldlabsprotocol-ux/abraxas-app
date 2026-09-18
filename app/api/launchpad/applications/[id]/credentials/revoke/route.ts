// FILE: app/api/launchpad/applications/[id]/credentials/revoke/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { revokeLaunchpadCredential } from "@/lib/partner/launchpad/credentialOps";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/credentials/revoke", 10);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const result = await revokeLaunchpadCredential(params.id, auth.session.partnerId);
  if (!result.ok) {
    if (result.code === "not_found") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
    }
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.credential_revoke_failed, 500);
  }

  return launchpadJson({ ok: true });
}
