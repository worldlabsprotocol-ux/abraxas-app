// FILE: app/api/launchpad/applications/[id]/first-proof/route.ts
// Deterministic sandbox first proof with persisted receipt. Session-bound, sandbox only.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { runSandboxFirstProof } from "@/lib/partner/externalActivation";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/first-proof", auth.session.partnerId, 8);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const result = await runSandboxFirstProof({
    application: app,
    partnerId: auth.session.partnerId,
    idempotencyKey: body.idempotency_key ? String(body.idempotency_key) : null,
  });

  if (!result.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, result.code);
  }

  return launchpadJson({ ...result });
}
