import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { SITE_URL } from "@/lib/siteUrl";
import { audienceHash, presentationLeaks, verifyEligibilityPresentation } from "@/lib/eligibilityPresentation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const expected = record.expected && typeof record.expected === "object"
    ? record.expected as Record<string, unknown>
    : {};
  const auth = await authenticatePartner(req, "verify:requests");
  const audience = auth?.ok
    ? audienceHash(auth.ctx.partnerId)
    : typeof expected.audience_hash === "string"
      ? expected.audience_hash
      : "";
  if (!audience) return NextResponse.json({ error: "audience_required" }, { status: 400 });
  const verifier_nonce = typeof expected.verifier_nonce === "string" ? expected.verifier_nonce : "";
  const policy_id = typeof expected.policy_id === "string" ? expected.policy_id : "";
  const policy_version = Number(expected.policy_version);
  const action = typeof expected.action === "string" ? expected.action : "";
  const environment = expected.environment === "production" ? "production" : expected.environment === "sandbox" ? "sandbox" : null;
  if (!verifier_nonce || !policy_id || !action || !environment || !Number.isInteger(policy_version)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  try {
    const result = await verifyEligibilityPresentation({
      envelope: record.envelope,
      expected: { audience_hash: audience, verifier_nonce, policy_id, policy_version, action, environment },
      fetchReceipt: async (receiptId) => {
        const res = await fetch(`${SITE_URL.replace(/\/$/, "")}/api/receipts/${encodeURIComponent(receiptId)}/public`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return null;
        const receipt = await res.json() as Record<string, unknown>;
        return {
          receipt_id: String(receipt.receipt_id ?? receiptId),
          currently_valid: receipt.currently_valid === true,
          status: typeof receipt.status === "string" ? receipt.status : undefined,
          decision_result: typeof receipt.decision_result === "string" ? receipt.decision_result : undefined,
          policy_id: typeof receipt.policy_id === "string" ? receipt.policy_id : undefined,
          withdrawn: receipt.withdrawn === true,
          revoked: receipt.status === "revoked",
        };
      },
    });
    if (presentationLeaks(result).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return NextResponse.json({ error: code }, { status: 503 });
  }
}
