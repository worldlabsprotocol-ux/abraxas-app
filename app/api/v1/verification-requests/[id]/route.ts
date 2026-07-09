// FILE: app/api/v1/verification-requests/[id]/route.ts
// Holder preview of a partner verification request (before consent).

import { NextRequest, NextResponse } from "next/server";
import { getVerificationRequestPreview } from "@/lib/verification/requestsService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const preview = await getVerificationRequestPreview(id);
    if (!preview) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (preview.status === "expired") {
      return NextResponse.json({ error: "Request expired" }, { status: 410 });
    }
    return NextResponse.json(preview);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Preview failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
