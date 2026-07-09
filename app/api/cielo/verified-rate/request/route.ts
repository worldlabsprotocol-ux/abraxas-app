// FILE: app/api/cielo/verified-rate/request/route.ts
// User view of their own verified-rate request status (session ownership required).

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getVerifiedRateRequestForSubject } from "@/lib/cielo/verifiedRateService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  if (!ref) {
    return NextResponse.json({ error: "ref query parameter required" }, { status: 400 });
  }

  try {
    const result = await getVerifiedRateRequestForSubject(ref, auth.session.suiAddress);
    if (!result) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load request";
    if (msg === "Forbidden") {
      return NextResponse.json({ error: "You can only view your own verified-rate requests" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
