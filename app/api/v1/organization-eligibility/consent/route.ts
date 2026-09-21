import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  createOrganizationConsent,
  organizationLeaks,
  organizationPartnerHmac,
  parseOrganizationConsentBody,
} from "@/lib/organizationEligibility";

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
  const parsed = parseOrganizationConsentBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const record = createOrganizationConsent({
    partnerHmac: organizationPartnerHmac(auth.ctx.partnerId),
    ...parsed,
  });
  const view = {
    ok: true,
    consent_ref: record.consent_ref,
    result_category: record.result_category,
    action: record.action,
    environment: record.environment,
    consent_bound: true,
    presentation_sufficient: false,
    utila_integration: false,
  };
  if (organizationLeaks(view).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
  return NextResponse.json(view);
}
