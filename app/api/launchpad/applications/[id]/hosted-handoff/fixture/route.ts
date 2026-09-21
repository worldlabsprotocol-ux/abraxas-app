// FILE: app/api/launchpad/applications/[id]/hosted-handoff/fixture/route.ts
// Sandbox fixture. No real holder, provider, OAuth, or Production activation.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { loadPartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest";
import { handoffLeaks, runSandboxHandoffFixture } from "@/lib/partner/hostedHandoff";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(req, "/api/launchpad/hosted-handoff-fixture", auth.session.partnerId, 10);
  if (limited) return limited;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  if (app.environment !== "sandbox") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "sandbox_only");
  }
  try {
    const stored = await loadPartnerFlowStoredConfig(app.id, auth.session.partnerId, app.allowed_return_urls);
    const result = await runSandboxHandoffFixture({ application: app, stored });
    if (handoffLeaks(result).length) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
    return launchpadJson({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, code);
  }
}
