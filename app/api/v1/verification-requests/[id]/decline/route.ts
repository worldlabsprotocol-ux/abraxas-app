// FILE: app/api/v1/verification-requests/[id]/decline/route.ts
// Holder declines a partner verification request — no claims shared.

import { NextRequest, NextResponse } from "next/server";
import { requirePartnerFlowHolder } from "@/lib/partner/partnerFlowHolderContext";
import { declineVerificationRequest } from "@/lib/verification/requestsService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const holderAuth = await requirePartnerFlowHolder(req);
  if (!holderAuth.ok) {
    return NextResponse.json(
      { error: holderAuth.error, code: holderAuth.code },
      { status: holderAuth.status },
    );
  }

  const { id } = await params;

  try {
    const result = await declineVerificationRequest({
      requestId: id,
      suiAddress: holderAuth.holder.subjectId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Decline failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
