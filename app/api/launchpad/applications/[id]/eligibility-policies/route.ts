// FILE: app/api/launchpad/applications/[id]/eligibility-policies/route.ts
// Application eligibility policy bindings — multi-policy catalog and configuration.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import {
  addApplicationPolicyBinding,
  buildApplicationPoliciesSummary,
} from "@/lib/partner/launchpad/applicationPolicyBindings";
import { resolveMultiPolicyNextAction } from "@/lib/partner/launchpad/multiPolicyNextAction";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{  id: string  }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/eligibility-policies",
    auth.session.partnerId,
    60,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(routeParams.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const summary = await buildApplicationPoliciesSummary(app);
  const next_action = resolveMultiPolicyNextAction(summary);

  return launchpadJson({
    ok: true,
    summary,
    next_action,
    notice:
      "Policy production eligibility and application production authorization are separate. Secondary bindings remain sandbox-only until explicitly authorized.",
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/eligibility-policies",
    auth.session.partnerId,
    20,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(routeParams.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: { policy_template_id?: string };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const policyTemplateId = body.policy_template_id?.trim();
  if (!policyTemplateId) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "policy_template_id_required");
  }

  const result = await addApplicationPolicyBinding({
    application: app,
    policyTemplateId,
  });

  if (!result.ok) {
    const status = result.code === "policy_already_primary" ? 409 : 400;
    return launchpadError(result.code, status);
  }

  const summary = await buildApplicationPoliciesSummary(app);
  return launchpadJson({
    ok: true,
    binding: result,
    summary,
    notice: "Policy configured in sandbox. Production authorization requires separate review per binding.",
  });
}
