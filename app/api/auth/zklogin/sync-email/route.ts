// FILE: app/api/auth/zklogin/sync-email/route.ts
// Backfill Google email on sui_zklogin_identities from the OAuth id_token (no re-login).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { emailFromIdToken, tryDecodeIdToken } from "@/lib/sui/zklogin/emailFromToken";
import { backfillZkLoginEmail } from "@/lib/sui/zklogin/serverEmail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as { id_token?: string };
  if (!body.id_token?.trim()) {
    return NextResponse.json({ error: "id_token required" }, { status: 400 });
  }

  const decoded = tryDecodeIdToken(body.id_token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid id_token" }, { status: 400 });
  }

  const email = emailFromIdToken(body.id_token);
  if (!email) {
    return NextResponse.json({
      error: "Google did not provide an email for this account. Re-authorize with email scope.",
      email: null,
    }, { status: 422 });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ email, synced: false, dev_mode: true });
  }

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const saved = await backfillZkLoginEmail(sb, auth.session.suiAddress, email);
  if (!saved) {
    return NextResponse.json({ error: "Could not save email" }, { status: 500 });
  }

  return NextResponse.json({
    email,
    synced: true,
    sui_address: auth.session.suiAddress,
  });
}
