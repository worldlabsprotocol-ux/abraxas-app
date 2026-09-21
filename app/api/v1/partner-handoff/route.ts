// FILE: app/api/v1/partner-handoff/route.ts
// Partner backend create. API key required. No browser secrets.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadPartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest";
import {
  createHostedHandoff,
  handoffLeaks,
  parseHandoffCreateBody,
  projectPartner,
} from "@/lib/partner/hostedHandoff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await authenticatePartner(req, "verify:requests");
  if (!auth || !auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: auth?.status ?? 401 });
  }
  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const parsed = parseHandoffCreateBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.code }, { status: 400 });
  const applicationId = req.headers.get("x-abraxas-application-id")?.trim() ?? "";
  if (!applicationId) return NextResponse.json({ error: "app_required" }, { status: 400 });
  const app = await getLaunchpadApplicationForPartner(applicationId, auth.ctx.partnerId);
  if (!app) return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  try {
    const stored = await loadPartnerFlowStoredConfig(app.id, auth.ctx.partnerId, app.allowed_return_urls);
    const record = await createHostedHandoff({ application: app, stored, runtime: parsed.runtime });
    const view = projectPartner(record);
    if (handoffLeaks(view).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
    return NextResponse.json({ ok: true, ...view, public_receipt_id: null });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return NextResponse.json({ error: code }, { status: code === "callback_rejected" || code === "not_configured" ? 400 : 503 });
  }
}
