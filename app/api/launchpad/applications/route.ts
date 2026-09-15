// FILE: app/api/launchpad/applications/route.ts
// List and provision Partner Launchpad sandbox applications.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";
import { buildLaunchpadWorkspaceView } from "@/lib/partner/launchpad/workspaceView";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import {
  attachPartnerConsoleSessionCookie,
  issuePartnerConsoleSessionToken,
} from "@/lib/partner/launchpad/partnerConsoleSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const workspace = await buildLaunchpadWorkspaceView(auth.session.partnerId);
  if (!workspace) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503);
  }

  return launchpadJson({ ok: true, workspace });
}

export async function POST(req: NextRequest) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/applications", 10);
  if (limited) return limited;

  const sessionAuth = await requireLaunchpadSession(req);
  const sessionPartnerId = sessionAuth.ok ? sessionAuth.session.partnerId : null;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const partnerId = String(body.partner_id ?? sessionPartnerId ?? "");
  if (!partnerId) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "partner_id required");
  }
  if (sessionPartnerId && partnerId !== sessionPartnerId) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403);
  }

  const result = await provisionLaunchpadSandbox({
    applicationName: String(body.application_name ?? ""),
    displayName: String(body.display_name ?? body.application_name ?? ""),
    partnerId,
    publicSlug: body.public_slug ? String(body.public_slug) : undefined,
    policyTemplateId: String(body.policy_template_id ?? ""),
    returnUrl: String(body.return_url ?? ""),
    idempotencyKey: body.idempotency_key ? String(body.idempotency_key) : undefined,
  });

  if (!result.ok) {
    const status = result.code === "conflict" ? 409 : 400;
    return launchpadError(
      LAUNCHPAD_PUBLIC_ERRORS[result.code === "provision_failed" ? "provision_failed" : "invalid_input"],
      status,
      result.code,
    );
  }

  const res = launchpadJson({
    ok: true,
    idempotency_replay: result.idempotencyReplay,
    application: result.result,
    api_key: result.apiKey ?? null,
  });

  if (result.apiKey && result.result.api_key_id) {
    const token = await issuePartnerConsoleSessionToken({
      partnerId: result.result.partner_id,
      apiKeyId: result.result.api_key_id,
      environment: "sandbox",
    });
    if (token) {
      attachPartnerConsoleSessionCookie(res, token);
    }
  }

  return res;
}
