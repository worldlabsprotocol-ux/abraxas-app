import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { issueEligibilityPresentation, presentationLeaks } from "@/lib/eligibilityPresentation";
import { presentationRequestOverride } from "@/lib/eligibilityPresentation/safety";
import { ISSUE_REQUEST_KEYS } from "@/lib/eligibilityPresentation/issue";

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
  if (presentationRequestOverride(body, [...ISSUE_REQUEST_KEYS, "verifier_nonce"])) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const request_ref = typeof record.request_ref === "string" ? record.request_ref : "";
  const receipt_id = typeof record.receipt_id === "string" ? record.receipt_id : "";
  const verifier_nonce = typeof record.verifier_nonce === "string" ? record.verifier_nonce : "";
  if (!request_ref || !receipt_id || verifier_nonce.length < 8) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  try {
    const envelope = await issueEligibilityPresentation({
      partnerId: auth.ctx.partnerId,
      request_ref,
      receipt_id,
      verifier_nonce,
    });
    if (presentationLeaks(envelope).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
    return NextResponse.json(
      { ok: true, envelope, presentation_sufficient: false },
      { headers: { "Content-Type": envelope.media_type } },
    );
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    const status = ["not_found", "cross_partner", "consent_required", "policy_mismatch", "environment_mismatch", "receipt_invalid", "expired"].includes(code)
      ? 400
      : 503;
    return NextResponse.json({ error: code }, { status });
  }
}
