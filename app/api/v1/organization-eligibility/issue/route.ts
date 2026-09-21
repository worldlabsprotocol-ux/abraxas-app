import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  issueOrganizationEligibility,
  organizationIssueOverride,
  organizationLeaks,
  projectOrganizationPublicView,
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
  if (organizationIssueOverride(body)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const record = body as { consent_ref?: string; subject_binding_hash?: string };
  if (!record.consent_ref) return NextResponse.json({ error: "consent_required" }, { status: 400 });
  try {
    const issued = await issueOrganizationEligibility({
      partnerId: auth.ctx.partnerId,
      consent_ref: record.consent_ref,
      subject_binding_hash: record.subject_binding_hash ?? null,
    });
    const view = {
      ok: true,
      ...projectOrganizationPublicView(issued),
      presentation_sufficient: false,
    };
    if (organizationLeaks(view).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
    return NextResponse.json(view);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
