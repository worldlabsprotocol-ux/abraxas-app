// FILE: app/api/v1/integration-verification/report/route.ts
// Partner server-side verification telemetry. Observability only — not authorization.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartnerScoped } from "@/lib/partner/partnerAuth";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  integrationObservabilityLeaks,
  partnerSafeFailureCode,
  recordIntegrationEventBestEffort,
} from "@/lib/partner/integrationObservability";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const applicationId = req.headers.get("x-abraxas-application-id")?.trim() ?? "";
  if (!applicationId) {
    return NextResponse.json({ error: "app_required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const app = await getLaunchpadApplicationById(applicationId);
  if (!app) return NextResponse.json({ error: "application_not_found" }, { status: 404 });

  const requiredEnvironment = app.environment === "production" ? "production" : "sandbox";
  const auth = await authenticatePartnerScoped(req, "verify:credential", {
    requiredApplicationId: applicationId,
    requiredCredentialEnvironment: requiredEnvironment,
    requireProductionActive: requiredEnvironment === "production",
  });
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  }
  if (auth.ctx.partnerId !== app.partner_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const outcome = typeof body.outcome === "string" ? body.outcome : "invalid";
  const errors = Array.isArray(body.errors)
    ? body.errors.filter((value): value is string => typeof value === "string")
    : [];
  const permitted = outcome === "permitted" && body.action === "permit";
  const receiptId = typeof body.receipt_id === "string" ? body.receipt_id : null;
  const requestId = typeof body.request_id === "string" ? body.request_id : null;
  const latencyMs = typeof body.latency_ms === "number" ? body.latency_ms : null;

  const payload = {
    partner_id: auth.ctx.partnerId,
    application_id: applicationId,
    outcome,
    request_id: requestId,
    receipt_id: receiptId,
    errors,
  };
  if (integrationObservabilityLeaks(payload).length > 0) {
    return NextResponse.json({ error: "redacted" }, { status: 400 });
  }

  const reason = permitted ? null : partnerSafeFailureCode(errors, outcome);
  await recordIntegrationEventBestEffort({
    partnerId: auth.ctx.partnerId,
    applicationId,
    environment: app.environment,
    eventType: permitted ? "receipt_verification_succeeded" : "receipt_verification_failed",
    lifecycleStage: "verification",
    outcome,
    partnerSafeReason: reason,
    requestId,
    receiptId,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    latencyMs,
  });
  await recordIntegrationEventBestEffort({
    partnerId: auth.ctx.partnerId,
    applicationId,
    environment: app.environment,
    eventType: permitted ? "access_decision_permit" : "access_decision_deny",
    lifecycleStage: "decision",
    outcome: permitted ? "permit" : "deny",
    partnerSafeReason: reason,
    requestId,
    receiptId,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
  });

  return NextResponse.json({ ok: true, recorded: true }, { headers: { "Cache-Control": "no-store" } });
}
