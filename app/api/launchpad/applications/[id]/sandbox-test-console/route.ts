// FILE: app/api/launchpad/applications/[id]/sandbox-test-console/route.ts
// Session-bound local fixture console. Never issues receipts, keys, or production.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { collectSandboxReadinessEvidence } from "@/lib/partner/launchpad/sandboxReadiness";
import {
  buildSandboxTestConsoleView,
  sandboxTestFixtureLeaks,
} from "@/lib/partner/launchpad/sandboxTestConsole";
import { SANDBOX_TEST_CONSOLE_PRODUCTION } from "@/lib/partner/launchpad/sandboxTestConsole/contract";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

async function loadConsole(req: NextRequest, applicationId: string) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return { ok: false as const, response: auth.response };

  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/sandbox-test-console",
    auth.session.partnerId,
    30,
  );
  if (limited) return { ok: false as const, response: limited };

  const app = await getLaunchpadApplicationForPartner(applicationId, auth.session.partnerId);
  if (!app) {
    return { ok: false as const, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404) };
  }

  let webhookConfigured = false;
  try {
    const evidence = await collectSandboxReadinessEvidence({
      application: app,
      partnerId: auth.session.partnerId,
    });
    webhookConfigured = evidence.webhookConfigured;
  } catch {
    webhookConfigured = false;
  }

  const capabilities = req.nextUrl.searchParams.getAll("capability");
  const body = buildSandboxTestConsoleView({
    application_id: app.id,
    status: app.status,
    environment: app.environment,
    policy_version: app.policy_version,
    policy_template_id: app.policy_template_id,
    allowed_return_urls: app.allowed_return_urls,
    has_sandbox_key: Boolean(app.api_key_id),
    webhook_configured: webhookConfigured,
  }, capabilities);

  if (sandboxTestFixtureLeaks(body).length > 0) {
    return { ok: false as const, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 503, "redacted") };
  }
  return { ok: true as const, body };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadConsole(req, params.id);
  if (!loaded.ok) return loaded.response;
  return launchpadJson(loaded.body);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (
    body.activate_production === true
    || body.issue_production_key === true
    || body.environment === "production"
  ) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, SANDBOX_TEST_CONSOLE_PRODUCTION.deny_code);
  }
  const loaded = await loadConsole(req, params.id);
  if (!loaded.ok) return loaded.response;
  return launchpadJson({
    ...loaded.body,
    accepted: false,
    notice: SANDBOX_TEST_CONSOLE_PRODUCTION.notice,
  });
}
