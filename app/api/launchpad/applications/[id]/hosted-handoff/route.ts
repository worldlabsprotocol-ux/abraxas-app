// FILE: app/api/launchpad/applications/[id]/hosted-handoff/route.ts
// Launchpad session create/read/cancel. Browser cannot supply callback or policy.

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
import {
  cancelHostedHandoff,
  createHostedHandoff,
  handoffLeaks,
  loadHandoff,
  parseHandoffCreateBody,
  projectPublic,
} from "@/lib/partner/hostedHandoff";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{  id: string  }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
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
  const app = await getLaunchpadApplicationForPartner(routeParams.id, auth.session.partnerId);
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
    try {
      const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
      await recordIntegrationEventBestEffort({
        partnerId: auth.session.partnerId,
        applicationId: app.id,
        environment: app.environment === "production" ? "production" : "sandbox",
        eventType: "hosted_handoff_create_failed",
        lifecycleStage: "request",
        outcome: "failed",
        partnerSafeReason: "hosted_handoff_unavailable",
        policyId: app.policy_id,
        policyVersion: app.policy_version,
        metadata: { public_code: code, outcome_class: status >= 500 ? "server_unavailable" : "client_blocked" },
      });
    } catch {
      // Observability must not block handoff errors.
    }
    return launchpadError(code, status);
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/hosted-handoff", auth.session.partnerId, 30);
  if (limited) return limited;
  const ref = req.nextUrl.searchParams.get("handoff_ref")?.trim() ?? "";
  if (!ref) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "missing_ref");
  const record = await loadHandoff(ref);
  if (!record || record.partner_id !== auth.session.partnerId || record.application_id !== routeParams.id) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 404, "not_found");
  }
  const view = projectPublic(record);
  if (handoffLeaks(view).length) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  return launchpadJson({ ok: true, ...view });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const ref = req.nextUrl.searchParams.get("handoff_ref")?.trim() ?? "";
  const record = await loadHandoff(ref);
  if (!record) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 404, "not_found");
  try {
    const cancelled = await cancelHostedHandoff(record, auth.session.partnerId, routeParams.id);
    return launchpadJson({ ok: true, ...projectPublic(cancelled) });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, code);
  }
}
