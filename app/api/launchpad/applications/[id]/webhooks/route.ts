// FILE: app/api/launchpad/applications/[id]/webhooks/route.ts
// Partner Launchpad self-service webhook endpoint.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import {
  getLaunchpadWebhookOverview,
  removeLaunchpadWebhookEndpoint,
  saveLaunchpadWebhookEndpoint,
  setLaunchpadWebhookEnabled,
} from "@/lib/partner/eventDelivery/launchpadWebhook";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const overview = await getLaunchpadWebhookOverview({
    partnerId: auth.session.partnerId,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    callbackConfigured: hasProductionLaunchpadCallback(app.allowed_return_urls),
  });
  return launchpadJson({ ok: true, ...overview });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/webhooks", 10);
  if (limited) return limited;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const body = await req.json().catch(() => ({})) as { endpoint_url?: string };
  if (!body.endpoint_url?.trim()) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "endpoint_url required");
  }

  const result = await saveLaunchpadWebhookEndpoint({
    partnerId: auth.session.partnerId,
    endpointUrl: body.endpoint_url,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
  });
  if (!result.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, result.error);
  }

  return launchpadJson({
    ok: true,
    config: {
      enabled: result.config.enabled,
      signing_secret_prefix: result.config.signing_secret_prefix,
    },
    signing_secret: result.signing_secret ?? null,
    notice: result.notice ?? null,
    secret_shown_once: Boolean(result.signing_secret),
  }, result.signing_secret ? 201 : 200);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/webhooks/enable", 10);
  if (limited) return limited;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const body = await req.json().catch(() => ({})) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "enabled required");
  }

  const result = await setLaunchpadWebhookEnabled({
    partnerId: auth.session.partnerId,
    enabled: body.enabled,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
  });
  if (!result.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, result.error);
  }
  return launchpadJson({ ok: true, enabled: body.enabled });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/webhooks/delete", 10);
  if (limited) return limited;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const result = await removeLaunchpadWebhookEndpoint(auth.session.partnerId);
  if (!result.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, result.error);
  }
  return launchpadJson({ ok: true, removed: true });
}
