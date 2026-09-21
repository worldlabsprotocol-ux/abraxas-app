// FILE: app/api/v1/partner-handoff/[ref]/route.ts
// Partner backend lookup. Receipt id only after completion. Replay-safe consume.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  consumeHandoffReceiptLookup,
  handoffLeaks,
  loadHandoff,
  projectPartner,
} from "@/lib/partner/hostedHandoff";

export const dynamic = "force-dynamic";
type RouteContext = { params: { ref: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await authenticatePartner(req, "verify:requests");
  if (!auth || !auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: auth?.status ?? 401 });
  }
  const record = await loadHandoff(params.ref);
  if (!record || record.partner_id !== auth.ctx.partnerId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const consume = req.nextUrl.searchParams.get("consume") === "1";
  try {
    const live = consume ? await consumeHandoffReceiptLookup(record, auth.ctx.partnerId) : record;
    const view = projectPartner(live);
    if (handoffLeaks(view).length) return NextResponse.json({ error: "redacted" }, { status: 503 });
    return NextResponse.json({
      ok: true,
      ...view,
      partner_must_call: "AbraxasPartnerKit.verifyReceiptId",
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
