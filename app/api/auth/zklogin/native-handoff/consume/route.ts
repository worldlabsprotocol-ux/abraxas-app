// FILE: app/api/auth/zklogin/native-handoff/consume/route.ts
// Bind a native holder handoff token to the in-app WebView browser session.

import { NextRequest, NextResponse } from "next/server";
import { attachBrowserSessionCookie, issueBrowserSessionToken } from "@/lib/auth/browserSession";
import { verifyAndConsumeNativeHandoffToken } from "@/lib/sui/zklogin/nativeHandoff";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { handoff_token?: string };
  const handoff = await verifyAndConsumeNativeHandoffToken(body.handoff_token);
  if (!handoff) {
    return NextResponse.json({ error: "Invalid or expired handoff" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let email = handoff.email;
  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const { data } = await sb
      .from("sui_zklogin_identities")
      .select("email")
      .eq("sui_address", handoff.suiAddress)
      .maybeSingle();
    if (typeof data?.email === "string" && data.email.includes("@")) {
      email = data.email;
    }
  }

  const token = await issueBrowserSessionToken(handoff.suiAddress);
  if (!token) {
    return NextResponse.json({ error: "Session signing unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const res = NextResponse.json(
    {
      ok: true,
      sui_address: normalizeSuiAddress(handoff.suiAddress),
      email: email ?? null,
      provider: handoff.provider,
    },
    { headers: NO_STORE_HEADERS },
  );
  attachBrowserSessionCookie(res, token);
  return res;
}
