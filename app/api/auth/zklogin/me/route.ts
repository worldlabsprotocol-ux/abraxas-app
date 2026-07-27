// FILE: app/api/auth/zklogin/me/route.ts
// Return zkLogin profile for the signed-in browser session.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireBrowserSession } from "@/lib/auth/browserSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!sbUrl || !sbKey) {
    return NextResponse.json({
      sui_address: auth.session.suiAddress,
      email: null,
    });
  }

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const { data } = await sb
    .from("sui_zklogin_identities")
    .select("email, sui_address, provider")
    .eq("sui_address", auth.session.suiAddress)
    .maybeSingle();

  return NextResponse.json({
    sui_address: auth.session.suiAddress,
    email: data?.email ?? null,
    provider: data?.provider ?? "google",
  });
}
