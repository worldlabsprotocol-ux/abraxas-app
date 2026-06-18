// FILE: app/api/identity/veriff/create-session/route.ts
// Starts a real Veriff verification session. Called when a user clicks
// "Start Verification" on the identity page. Stores a pending record so
// the webhook has something to update when Veriff reports a decision.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createVeriffSession } from "@/lib/veriff";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";

    const session = await createVeriffSession({
      vendorData: email,
      callbackUrl: `${appUrl}/identity?verified=1`,
    });

    await supabase.from("identity_verifications").upsert({
      user_email: email,
      veriff_session_id: session.sessionId,
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_email" });

    return NextResponse.json({ verificationUrl: session.verificationUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Honest failure, not a silent fake success, this is a real identity
    // check and the user should know if it could not start.
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
