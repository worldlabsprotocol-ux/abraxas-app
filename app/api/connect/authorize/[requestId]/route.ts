// FILE: app/api/connect/authorize/[requestId]/route.ts
// Connect flow preview (public-safe) + user consent completion.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import {
  completeAuthorizationConsent,
  getAuthorizationPublicView,
} from "@/lib/connect/authorizationService";
import { getPolicy } from "@/lib/verification/requestsService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  const view = await getAuthorizationPublicView(requestId);
  if (!view) {
    return NextResponse.json({ error: "Authorization request not found" }, { status: 404 });
  }

  const policy = await getPolicy(view.policy_id);

  return NextResponse.json({
    authorization: view,
    policy_name: policy?.name ?? view.policy_id,
    never_shared: [
      "Passport image",
      "Passport number",
      "Full date of birth",
      "Home address",
      "Selfie / biometric data",
    ],
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { requestId } = await params;

  try {
    const result = await completeAuthorizationConsent({
      requestId,
      subjectId: session.session.suiAddress,
    });

    return NextResponse.json({
      status: result.status,
      receipt_id: result.receipt_id,
      redirect_url: result.redirect_url,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
