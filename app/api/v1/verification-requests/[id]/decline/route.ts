// FILE: app/api/v1/verification-requests/[id]/decline/route.ts
// Holder declines a partner verification request — no claims shared.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { declineVerificationRequest } from "@/lib/verification/requestsService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await params;

  try {
    const result = await declineVerificationRequest({
      requestId: id,
      suiAddress: session.session.suiAddress,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Decline failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
