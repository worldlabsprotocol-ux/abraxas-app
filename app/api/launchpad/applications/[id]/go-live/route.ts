// FILE: app/api/launchpad/applications/[id]/go-live/route.ts
// Go-live readiness and review request. Never issues a production key.

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
  GO_LIVE_PRODUCTION,
  GO_LIVE_PUBLIC_ERRORS,
  buildGoLiveReadinessView,
  clientOverrideRejected,
  goLiveViewLeaks,
  loadGoLiveEvidence,
  submitGoLiveReviewRequest,
  validateGoLiveNote,
} from "@/lib/partner/launchpad/goLiveReadiness";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

async function authorize(req: NextRequest, applicationId: string, limit: number) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return { ok: false as const, response: auth.response };

  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/go-live",
    auth.session.partnerId,
    limit,
  );
  if (limited) return { ok: false as const, response: limited };

  const app = await getLaunchpadApplicationForPartner(applicationId, auth.session.partnerId);
  if (!app) {
    return { ok: false as const, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404) };
  }
  return { ok: true as const, partnerId: auth.session.partnerId, app };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const loaded = await authorize(req, params.id, 30);
  if (!loaded.ok) return loaded.response;

  const evidence = await loadGoLiveEvidence({
    application: loaded.app,
    partnerId: loaded.partnerId,
  });
  const view = buildGoLiveReadinessView(evidence, req.nextUrl.searchParams.getAll("capability"));
  if (goLiveViewLeaks(view).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 503, "redacted");
  }
  return launchpadJson(view);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const loaded = await authorize(req, params.id, 8);
  if (!loaded.ok) return loaded.response;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (clientOverrideRejected(body)) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, GO_LIVE_PUBLIC_ERRORS.client_override);
  }
  if (
    body.activate_production === true
    || body.issue_production_key === true
    || body.environment === "production"
  ) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, GO_LIVE_PRODUCTION.deny_code);
  }

  const note = validateGoLiveNote(body.partner_note ?? body.request_notes);
  if (!note.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, note.code);
  }

  const evidence = await loadGoLiveEvidence({
    application: loaded.app,
    partnerId: loaded.partnerId,
  });
  const view = buildGoLiveReadinessView(evidence);
  const submitted = await submitGoLiveReviewRequest({ evidence, view, note: note.note });
  if (!submitted.ok) {
    const status = submitted.code === "go_live_not_ready" ? 400 : 500;
    return launchpadJson({
      ok: false,
      code: submitted.code,
      error: submitted.code,
      lifecycle: view.lifecycle,
      lifecycle_label: view.lifecycle_label,
      next_steps: view.next_steps,
      issues_production_key: false,
      activates_production: false,
      request: view.request,
    }, status);
  }

  return launchpadJson({
    ok: true,
    replay: submitted.replay,
    automated_activation: false,
    issues_production_key: false,
    activates_production: false,
    changes_policy: false,
    lifecycle: submitted.request.status === "approved" ? "approved_for_production" : "under_review",
    request: submitted.request,
    production: GO_LIVE_PRODUCTION,
  });
}
