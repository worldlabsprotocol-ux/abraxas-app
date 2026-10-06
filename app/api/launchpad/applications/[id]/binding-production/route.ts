// FILE: app/api/launchpad/applications/[id]/binding-production/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { buildApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";
import { requestBindingProduction } from "@/lib/partner/launchpad/bindingProduction/request";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(_req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  const summary = await buildApplicationPoliciesSummary(app);
  return launchpadJson({
    ok: true,
    bindings: summary.bindings.map((b) => ({
      binding_id: b.binding_id,
      title: b.title,
      pack_id: b.pack_id,
      production_status: b.production_status,
      application_production_authorized: b.application_production_authorized,
      production_next_action: b.production_next_action,
    })),
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/binding-production", auth.session.partnerId, 10);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }
  const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const bindingId = typeof record.binding_id === "string" ? record.binding_id.trim() : "";
  if (!bindingId) return launchpadError("binding_id_required", 400);
  const note = typeof record.note === "string" ? record.note.trim() : null;

  const result = await requestBindingProduction({
    applicationId: params.id,
    partnerId: auth.session.partnerId,
    bindingId,
    note,
  });

  if (!result.ok) {
    const status = result.code === "pending_request_exists" || result.code === "idempotency_replay" ? 409 : 400;
    return launchpadError(result.code, status);
  }

  return launchpadJson({
    ok: true,
    replay: result.replay,
    request_id: result.request_id,
    binding_id: result.binding_id,
    production_status: result.production_status,
  });
}
