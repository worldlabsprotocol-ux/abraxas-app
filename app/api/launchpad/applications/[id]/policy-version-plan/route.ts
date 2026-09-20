// FILE: app/api/launchpad/applications/[id]/policy-version-plan/route.ts
// Session-bound policy version planner. Does not adopt, edit, or issue keys.

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
  POLICY_VERSION_FORBIDDEN_KEYS,
  buildPolicyVersionPlannerView,
  policyVersionPlannerLeaks,
} from "@/lib/partner/launchpad/policyVersionPlanner";
import { rejectClientDisclosureConfig } from "@/lib/privacy/selectiveDisclosure";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

async function assemble(applicationId: string, partnerId: string) {
  const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
  if (!app) return { ok: false as const, status: 404 as const };
  const view = buildPolicyVersionPlannerView(app);
  if (policyVersionPlannerLeaks(view).length > 0) {
    return { ok: false as const, status: 503 as const };
  }
  return { ok: true as const, view };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/policy-version-plan",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;
  const clientPartner = req.nextUrl.searchParams.get("partner_id");
  if (clientPartner && clientPartner !== auth.session.partnerId) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403);
  }
  if (req.nextUrl.searchParams.get("policy_version") || req.nextUrl.searchParams.get("target_version")) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "unknown_input");
  }
  const queryOverrides: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    queryOverrides[key] = value;
  });
  if (!rejectClientDisclosureConfig(queryOverrides).ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "unknown_input");
  }
  const assembled = await assemble(params.id, auth.session.partnerId);
  if (!assembled.ok) {
    return launchpadError(
      assembled.status === 404 ? LAUNCHPAD_PUBLIC_ERRORS.application_not_found : LAUNCHPAD_PUBLIC_ERRORS.forbidden,
      assembled.status,
    );
  }
  return launchpadJson({ ok: true, ...assembled.view });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/policy-version-plan",
    auth.session.partnerId,
    20,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }
  const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  if (record.activate_production === true || record.issue_production_key === true || record.environment === "production") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, "production_denied");
  }
  const keys = Object.keys(record);
  if (keys.some((key) => (POLICY_VERSION_FORBIDDEN_KEYS as readonly string[]).includes(key))) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "unknown_input");
  }
  if (!rejectClientDisclosureConfig(record).ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "unknown_input");
  }
  const assembled = await assemble(params.id, auth.session.partnerId);
  if (!assembled.ok) {
    return launchpadError(
      assembled.status === 404 ? LAUNCHPAD_PUBLIC_ERRORS.application_not_found : LAUNCHPAD_PUBLIC_ERRORS.forbidden,
      assembled.status,
    );
  }
  return launchpadJson({ ok: true, mutated: false, ...assembled.view });
}
