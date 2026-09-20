// FILE: app/api/launchpad/applications/[id]/partner-flow-request/route.ts
// Session-bound Partner Flow request configuration. Does not start OAuth or issue receipts.

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
  buildPartnerFlowRequestView,
  loadPartnerFlowStoredConfig,
  loadStarterKitEvidenced,
  parsePartnerFlowRequestBody,
  partnerFlowViewLeaks,
  savePartnerFlowRequestConfig,
} from "@/lib/partner/launchpad/partnerFlowRequest";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

async function assemble(applicationId: string, partnerId: string) {
  const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
  if (!app) return { ok: false as const, status: 404 as const };
  let stored;
  try {
    stored = await loadPartnerFlowStoredConfig(app.id, partnerId);
  } catch {
    return { ok: false as const, status: 503 as const };
  }
  let starterKitEvidenced = false;
  try {
    starterKitEvidenced = await loadStarterKitEvidenced(app.id, partnerId);
  } catch {
    starterKitEvidenced = false;
  }
  const view = buildPartnerFlowRequestView({ application: app, stored, starterKitEvidenced });
  if (partnerFlowViewLeaks(view).length > 0) {
    return { ok: false as const, status: 503 as const };
  }
  return { ok: true as const, app, view };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/partner-flow-request",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;
  const clientPartner = req.nextUrl.searchParams.get("partner_id");
  if (clientPartner && clientPartner !== auth.session.partnerId) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403);
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
    "/api/launchpad/partner-flow-request",
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
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (record.activate_production === true || record.issue_production_key === true || record.environment === "production") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, "production_denied");
  }
  const parsed = parsePartnerFlowRequestBody(body);
  if (!parsed.ok) {
    const status = parsed.error === "callback_rejected" ? 400 : 400;
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, status, parsed.error);
  }
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  try {
    await savePartnerFlowRequestConfig({
      application: app,
      partnerId: auth.session.partnerId,
      parsed: parsed.input,
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "callback_rejected") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected, 400, "callback_rejected");
    }
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "unavailable");
  }
  const assembled = await assemble(params.id, auth.session.partnerId);
  if (!assembled.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, assembled.status);
  }
  return launchpadJson({ ok: true, ...assembled.view });
}
