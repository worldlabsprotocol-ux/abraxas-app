// FILE: app/api/v1/verification-requests/[id]/decline/route.ts
// Holder declines a partner verification request — no claims shared.

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { declineVerificationRequest } from "@/lib/verification/requestsService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.error === "forbidden" ? 403 : 401 });
  }

  const { id } = await params;

  try {
    const result = await declineVerificationRequest({
      requestId: id,
      subjectId: session.subjectId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Decline failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
