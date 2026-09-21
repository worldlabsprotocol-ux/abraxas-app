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
type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(req, "/api/launchpad/hosted-handoff", auth.session.partnerId, 20);
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
  if (app.environment !== "sandbox") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "sandbox_only");
  }
  let stored;
  try {
    stored = await loadPartnerFlowStoredConfig(app.id, auth.session.partnerId, app.allowed_return_urls);
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "unavailable");
  }
  try {
    const record = await createHostedHandoff({ application: app, stored, runtime: parsed.runtime });
    const view = projectPublic(record);
    if (handoffLeaks(view).length) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
    return launchpadJson({ ok: true, ...view });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    const status = code === "callback_rejected" || code === "not_configured" || code === "app_unpinned" ? 400 : 503;
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, status, code);
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(req, "/api/launchpad/hosted-handoff", auth.session.partnerId, 30);
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
