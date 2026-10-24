// FILE: app/api/launchpad/applications/[id]/hosted-handoff/route.ts
// Launchpad session create/read/cancel. Browser cannot supply callback or policy.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { loadPartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest";
import {
  cancelHostedHandoff,
  createHostedHandoff,
  handoffLeaks,
  loadHandoff,
  parseHandoffCreateBody,
  projectPublic,
} from "@/lib/partner/hostedHandoff";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

const SOVEREIGN_HANDOFF_MESSAGE =
  "Live hosted holder handoff is not yet available on sovereign PostgreSQL. Use the verification harness and follow-up live-verification PR.";

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (launchpadUsesSovereignPostgres()) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 501, SOVEREIGN_HANDOFF_MESSAGE);
  }
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/hosted-handoff", auth.session.partnerId, 20);
  if (limited) return limited;
  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }
  const parsed = parseHandoffCreateBody(body);
  if (!parsed.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, parsed.code);
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  if (app.environment === "production") {
    if (!app.production_activated_at || app.status !== "active") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "production_not_activated");
    }
  } else if (app.environment !== "sandbox") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "invalid_environment");
  }
  let stored;
  try {
    stored = await loadPartnerFlowStoredConfig(app.id, auth.session.partnerId, app.allowed_return_urls);
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "unavailable");
  }
  try {
    const record = await createHostedHandoff({
      application: app,
      stored,
      runtime: parsed.runtime,
      bindingId: parsed.binding_id,
    });
    const view = projectPublic(record);
    if (handoffLeaks(view).length) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
    return launchpadJson({ ok: true, ...view });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    const operatorMessage =
      error instanceof Error && "operator_message" in error
        ? String((error as { operator_message?: string }).operator_message)
        : undefined;
    if (code === "holder_origin_mismatch" || code === "holder_origin_unconfigured") {
      return launchpadError(code, 503, operatorMessage);
    }
    const bindingCodes = new Set([
      "AMBIGUOUS_POLICY_BINDING",
      "POLICY_BINDING_NOT_FOUND",
      "POLICY_BINDING_NOT_ACTIVE",
      "POLICY_BINDING_ENVIRONMENT_MISMATCH",
      "PRODUCTION_BINDING_NOT_AUTHORIZED",
    ]);
    const status = code === "AMBIGUOUS_POLICY_BINDING"
      ? 409
      : bindingCodes.has(code) || code === "callback_rejected" || code === "not_configured" || code === "app_unpinned"
        ? 400
        : 503;
    return launchpadError(code, status);
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  if (launchpadUsesSovereignPostgres()) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 501, SOVEREIGN_HANDOFF_MESSAGE);
  }
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/hosted-handoff", auth.session.partnerId, 30);
  if (limited) return limited;
  const ref = req.nextUrl.searchParams.get("handoff_ref")?.trim() ?? "";
  if (!ref) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "missing_ref");
  const record = await loadHandoff(ref);
  if (!record || record.partner_id !== auth.session.partnerId || record.application_id !== params.id) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 404, "not_found");
  }
  const view = projectPublic(record);
  if (handoffLeaks(view).length) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  return launchpadJson({ ok: true, ...view });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const ref = req.nextUrl.searchParams.get("handoff_ref")?.trim() ?? "";
  const record = await loadHandoff(ref);
  if (!record) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 404, "not_found");
  try {
    const cancelled = await cancelHostedHandoff(record, auth.session.partnerId, params.id);
    return launchpadJson({ ok: true, ...projectPublic(cancelled) });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, code);
  }
}
