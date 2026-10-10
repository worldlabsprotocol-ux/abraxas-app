// FILE: app/api/identity/veriff/webhook/route.ts
// Veriff calls this endpoint when a verification decision is made.
// Verifies the signature, then writes the real outcome to Supabase.
// This is what actually turns the Passport's identity stamp from a
// hardcoded UI state into a real, earned credential.
import { NextRequest, NextResponse } from "next/server";
import { supabaseForRoute } from "@/lib/supabase/routeAdmin";
import { verifyVeriffWebhookSignature, parseVeriffDecision } from "@/lib/veriff";

export async function POST(req: NextRequest) {
  const supabase = supabaseForRoute();
  const rawBody = await req.text();
  const signature = req.headers.get("x-hmac-signature");

  if (!verifyVeriffWebhookSignature(rawBody, signature)) {
    // Reject anything not actually signed by Veriff, this is the
    // difference between a real credential and a forgeable one.
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = parseVeriffDecision(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "malformed payload" }, { status: 400 });
  }

  if (!parsed) {
    return NextResponse.json({ error: "unrecognized payload shape" }, { status: 400 });
  }

  await supabase
    .from("identity_verifications")
    .update({ status: parsed.status, updated_at: new Date().toISOString() })
    .eq("user_email", parsed.vendorData);

  return NextResponse.json({ received: true });
}
