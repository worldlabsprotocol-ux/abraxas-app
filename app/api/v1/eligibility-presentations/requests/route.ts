import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  createPresentationRequest,
  hostedFlowUrl,
  parseCreateRequestBody,
  presentationLeaks,
} from "@/lib/eligibilityPresentation";
import { audienceHash } from "@/lib/eligibilityPresentation/opaque";

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
  const parsed = parseCreateRequestBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const record = await createPresentationRequest({ ...parsed, partnerId: auth.ctx.partnerId });
    const view = {
      ok: true,
      request_ref: record.request_ref,
      audience_hash: audienceHash(auth.ctx.partnerId),
      expires_at: record.expires_at,
      environment: record.environment,
      hosted_verify_url: hostedFlowUrl({
        partnerId: auth.ctx.partnerId,
        policyId: record.policy_id,
        requestRef: record.request_ref,
      }),
      presentation_sufficient: false,
      bearer_credential: false,
    };
    if (presentationLeaks(view).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
    return NextResponse.json(view);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    const clientError = ["replayed", "invalid_expiry", "policy_mismatch", "action_mismatch", "environment_mismatch"].includes(code);
    return NextResponse.json({ error: code }, { status: clientError ? 400 : 503 });
  }
}
