import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { buildToken2022StudioJourney } from "@/lib/partner/integrationStudio/token2022Entitlement/studioJourney.server";
import { token2022EntitlementRecovery } from "@/lib/partner/integrationStudio/token2022Entitlement/recovery";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/token2022-entitlement-journey",
    auth.session.partnerId,
    40,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) {
    return launchpadJson({
      ok: false,
      code: "application_not_found",
      recovery: token2022EntitlementRecovery("application_not_found"),
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    phase?: "capabilities" | "independent_handoff";
    client_policy_id?: string;
    client_partner_id?: string;
    run_structural_verify?: boolean;
  };

  if (body.client_policy_id && body.client_policy_id !== app.policy_id) {
    return launchpadJson({
      ok: false,
      code: "policy_scope_mismatch",
      recovery: token2022EntitlementRecovery("policy_scope_mismatch"),
    });
  }
  if (body.client_partner_id && body.client_partner_id !== auth.session.partnerId) {
    return launchpadJson({
      ok: false,
      code: "policy_scope_mismatch",
      recovery: token2022EntitlementRecovery("policy_scope_mismatch"),
    });
  }

  const phase = body.phase ?? "capabilities";
  const runStructural =
    phase === "independent_handoff" && Boolean(body.run_structural_verify);

  const journey = await buildToken2022StudioJourney({
    app,
    runStructuralVerify: runStructural,
  });

  return launchpadJson({
    ...journey,
    phase,
  });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  const journey = await buildToken2022StudioJourney({ app, runStructuralVerify: false });
  return launchpadJson({ ...journey, phase: "capabilities" });
}