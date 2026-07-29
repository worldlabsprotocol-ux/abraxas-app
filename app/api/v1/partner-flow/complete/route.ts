import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { completePartnerFlowAfterApproval } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/partner-flow/complete
 * After manual approval + credential issuance, redirect holder to partner.
 */
export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: {
    partner_id?: string;
    policy_id?: string;
    return_url?: string;
    verification_request_id?: string;
  };
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

  const result = await completePartnerFlowAfterApproval({
    partnerId,
    policyId,
    returnUrl,
    suiAddress: session.session.suiAddress,
    verificationRequestId: body.verification_request_id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
