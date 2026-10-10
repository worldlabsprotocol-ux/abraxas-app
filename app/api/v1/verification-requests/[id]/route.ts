// FILE: app/api/v1/verification-requests/[id]/route.ts
// Holder preview of a partner verification request (before consent).

import { NextRequest, NextResponse } from "next/server";
import { requirePartnerFlowHolder } from "@/lib/partner/partnerFlowHolderContext";
import { getVerificationRequestPreview } from "@/lib/verification/requestsService";

export async function GET(
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
    const preview = await getVerificationRequestPreview(id, holderAuth.holder.subjectId);
    if (!preview) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (preview.status === "expired") {
      return NextResponse.json({ error: "Request expired" }, { status: 410 });
    }
    return NextResponse.json(preview);
  } catch (e: unknown) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
