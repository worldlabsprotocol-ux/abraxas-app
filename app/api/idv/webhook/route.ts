// FILE: app/api/idv/webhook/route.ts
// Veriff decision webhook → Abraxas credential + on-chain passport.

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { processVeriffDecision } from "@/lib/idv/processVeriffDecision";

const VERIFF_SECRET = process.env.VERIFF_SECRET ?? "";

function verifySignature(payload: string, sig: string): boolean {
  if (!VERIFF_SECRET) {
    return process.env.NODE_ENV !== "production";
  }
  const expected = createHmac("sha256", VERIFF_SECRET).update(payload).digest("hex");
  return expected === sig;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-hmac-signature") ?? "";

  if (!verifySignature(rawBody, sig)) {
    console.error("[webhook] Invalid Veriff signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    verification?: {
      id: string;
      status: string;
      vendorData?: string;
      person?: { firstName?: string; lastName?: string; nationality?: string };
      document?: { type?: string; country?: string; state?: string };
    };
  };

  const v = event.verification;
  if (!v) return NextResponse.json({ ok: true });

  const result = await processVeriffDecision(v);
  if (result.status === "approved") {
    console.log(`[webhook] ✓ Credential issued for ${result.holder} → ${result.jti}`);
  }

  return NextResponse.json({ ok: true, jti: result.jti });
}
