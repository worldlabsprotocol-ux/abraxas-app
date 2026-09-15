// FILE: app/api/launchpad/applications/[id]/test/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { runLaunchpadTestScenario } from "@/lib/partner/launchpad/runTestScenario";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/test", 30);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  let body: { scenario_id?: string; return_url?: string };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const result = await runLaunchpadTestScenario({
    applicationId: params.id,
    partnerId: auth.session.partnerId,
    scenarioId: String(body.scenario_id ?? ""),
    returnUrl: body.return_url,
  });

  if (!result.ok) {
    if (result.code === "not_found") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
    }
    if (result.code === "return_url_rejected") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected, 400);
    }
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  return launchpadJson({ ok: true, result: result.result });
}
