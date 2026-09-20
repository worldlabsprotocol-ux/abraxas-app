// FILE: app/api/receipts/verification-keys/route.ts
// Public-safe receipt verification-key document. No private material. Not a grant.

import { NextRequest, NextResponse } from "next/server";
import {
  buildReceiptVerificationKeyDocument,
  rejectReceiptKeyClientOverride,
  assertNoPrivateReceiptKeyMaterial,
} from "@/lib/decisionReceipts/verificationKeyLifecycle";

export const dynamic = "force-dynamic";

const ALLOWED_QUERY: string[] = [];

export async function GET(req: NextRequest) {
  if (rejectReceiptKeyClientOverride(req.nextUrl.searchParams, ALLOWED_QUERY)) {
    return NextResponse.json({ ok: false, status: "invalid" }, { status: 400 });
  }
  const document = buildReceiptVerificationKeyDocument();
  if ("ok" in document && document.ok === false) {
    const status = document.status === "unavailable" ? 503 : 503;
    return NextResponse.json({ ok: false, status: document.status }, { status });
  }
  if (assertNoPrivateReceiptKeyMaterial(document).length > 0) {
    return NextResponse.json({ ok: false, status: "inconsistent" }, { status: 503 });
  }
  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
