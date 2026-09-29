// FILE: app/api/v1/partner-handoff/route.ts
// Partner backend create. API key required. No browser secrets.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartnerScoped } from "@/lib/partner/partnerAuth";
import {
  getLaunchpadApplicationById,
  getLaunchpadApplicationForPartner,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadPartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest";
import {
  createHostedHandoff,
  handoffLeaks,
  parseHandoffCreateBody,
  projectPartner,
} from "@/lib/partner/hostedHandoff";
import { resolveApplicationPolicyBinding } from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const applicationIdHeader = req.headers.get("x-abraxas-application-id")?.trim() ?? "";
  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const parsed = parseHandoffCreateBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.code }, { status: 400 });
  if (!applicationIdHeader) return NextResponse.json({ error: "app_required" }, { status: 400 });

  const appPreview = await getLaunchpadApplicationById(applicationIdHeader);
  if (!appPreview) return NextResponse.json({ error: "application_not_found" }, { status: 404 });

  const appForBinding = await getLaunchpadApplicationForPartner(applicationIdHeader, appPreview.partner_id);
  if (!appForBinding) return NextResponse.json({ error: "application_not_found" }, { status: 404 });

  const bindingPreview = await resolveApplicationPolicyBinding({
    application: appForBinding,
    partnerId: appForBinding.partner_id,
    bindingId: parsed.binding_id,
  });
  if (!bindingPreview.ok) {
    const status = bindingPreview.code === "AMBIGUOUS_POLICY_BINDING" ? 409 : 400;
    return NextResponse.json({ error: bindingPreview.code }, { status });
  }

  const requiredEnvironment = bindingPreview.binding.environment;
  const auth = await authenticatePartnerScoped(req, "verify:requests", {
    requiredApplicationId: applicationIdHeader,
    requiredCredentialEnvironment: requiredEnvironment,
    requireProductionActive: requiredEnvironment === "production",
  });
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  }

  const app = await getLaunchpadApplicationForPartner(applicationIdHeader, auth.ctx.partnerId);
  if (!app) return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  if (requiredEnvironment === "production" && !app.production_activated_at) {
    return NextResponse.json({ error: "production_not_activated" }, { status: 403 });
  }
  try {
    const stored = await loadPartnerFlowStoredConfig(app.id, auth.ctx.partnerId, app.allowed_return_urls);
    const record = await createHostedHandoff({
      application: app,
      stored,
      runtime: parsed.runtime,
      bindingId: parsed.binding_id,
    });
    const view = projectPartner(record);
    if (handoffLeaks(view).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
    return NextResponse.json({ ok: true, ...view, public_receipt_id: null });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return NextResponse.json({ error: code }, { status: code === "callback_rejected" || code === "not_configured" ? 400 : 503 });
  }
}
