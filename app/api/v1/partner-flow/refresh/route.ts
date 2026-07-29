import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { refreshPartnerSessionReceipt } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/partner-flow/refresh
 * Re-issue a session receipt when the prior receipt expired but the credential is still valid.
 */
export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: { partner_id?: string; policy_id?: string; return_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerId = body.partner_id?.trim();
  const policyId = body.policy_id?.trim();
  const returnUrl = body.return_url?.trim();
  if (!partnerId || !policyId || !returnUrl) {
    return NextResponse.json(
      { error: "partner_id, policy_id, and return_url are required" },
      { status: 400 },
    );
  }

  const allowed = await isAllowedPartnerReturnUrl(partnerId, returnUrl);
  if (!allowed) {
    return NextResponse.json(
      { error: "return_url is not allowed for this partner" },
      { status: 400 },
    );
  }

  try {
    const result = await refreshPartnerSessionReceipt({
      partnerId,
      policyId,
      returnUrl,
      suiAddress: session.session.suiAddress,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Receipt refresh failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
