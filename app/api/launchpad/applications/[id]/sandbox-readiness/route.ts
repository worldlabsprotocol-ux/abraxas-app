// FILE: app/api/launchpad/applications/[id]/sandbox-readiness/route.ts
// Partner Sandbox / Integration Readiness Gate. TEST-only. Never activates production.

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
  buildSandboxReadinessReport,
  isSandboxReadinessStage,
  recordSandboxReadinessRun,
  runSandboxReadinessStage,
} from "@/lib/partner/launchpad/sandboxReadiness";
import type { SandboxStageRunResult } from "@/lib/partner/launchpad/sandboxReadiness/execute";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

function reportBody(
  report: Awaited<ReturnType<typeof buildSandboxReadinessReport>>,
  extra: Record<string, unknown> = {},
) {
  return {
    ok: true,
    label: report.plan.environment_label,
    sandbox_pass_is_not_production_authorization: true,
    issues_production_receipt: false,
    production_activation_eligible: report.plan.production_activation_eligible,
    overall: report.plan.overall,
    score: report.plan.score,
    next_action: report.plan.next_action,
    last_run_at: report.plan.last_run_at,
    blockers: report.plan.blockers,
    stages: report.plan.stages,
    evidence: report.plan.evidence,
    manifest: report.manifest,
    ...extra,
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/sandbox-readiness",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const report = await buildSandboxReadinessReport({
    application: app,
    partnerId: auth.session.partnerId,
  });
  return launchpadJson(reportBody(report));
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/sandbox-readiness/run",
    auth.session.partnerId,
    12,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: {
    stage?: string;
    idempotency_key?: string;
    callback_url?: string;
    event_type?: string;
  };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const stage = String(body.stage ?? "");
  if (!isSandboxReadinessStage(stage)) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "event_type_not_supported");
  }

  const executed = await runSandboxReadinessStage({
    application: app,
    partnerId: auth.session.partnerId,
    stage,
    idempotencyKey: body.idempotency_key,
    callbackUrl: body.callback_url,
    eventType: body.event_type,
  });
  if (!executed.ok) {
    return launchpadError(executed.code, 400);
  }

  let run: SandboxStageRunResult = executed.result;
  const report = await buildSandboxReadinessReport({
    application: app,
    partnerId: auth.session.partnerId,
  });
  if (stage === "policy_version_compatibility") {
    const derived = report.plan.stages.find((item) => item.id === "policy_version_compatibility");
    if (derived) {
      run = {
        ...run,
        status: derived.status,
        code: derived.code,
        detail: derived.detail,
      };
    }
  }

  if (!run.duplicate) {
    await recordSandboxReadinessRun({
      application: app,
      partnerId: auth.session.partnerId,
      run,
      idempotencyKey: body.idempotency_key,
    });
  }

  const refreshed = await buildSandboxReadinessReport({
    application: app,
    partnerId: auth.session.partnerId,
  });
  return launchpadJson(reportBody(refreshed, {
    run,
    activates_production: false,
  }));
}
