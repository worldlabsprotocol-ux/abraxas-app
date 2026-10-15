// FILE: app/api/passport/portable-trust/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { buildHolderPortableExport, getHolderReceiptIfOwned } from "@/lib/passport/portableTrust";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { toPortableExportResponse } from "@/lib/passport/portableTrust/exportResponse";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";

export async function POST(req: NextRequest) {
  const csrf = portableTrustCsrfRejected(req);
  if (csrf) {
    return NextResponse.json({ error: csrf }, { status: 403 });
  }
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: session.message },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }
  let body: { receipt_id?: string };
  try {
    body = (await req.json()) as { receipt_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.receipt_id) {
    return NextResponse.json({ error: "receipt_id required" }, { status: 400 });
  }
  try {
    const record = await getHolderReceiptIfOwned({
      subjectId: session.subjectId,
      receiptId: body.receipt_id,
    });
    if (!record) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }
    const exported = buildHolderPortableExport({ record });
    if (!exported.ok) {
      return NextResponse.json({ error: exported.code }, { status: 400 });
    }
    return NextResponse.json(toPortableExportResponse(exported.bundle));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Export unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
