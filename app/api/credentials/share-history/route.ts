// FILE: app/api/credentials/share-history/route.ts
// Partner access history — consent receipts for authenticated holder.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { resolveBrowserSession } from "@/lib/auth/browserSession";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const session = await resolveBrowserSession(req);
  const querySui = req.nextUrl.searchParams.get("sui");

  let subject: string | null = null;
  if (session) {
    subject = session.suiAddress;
  } else if (querySui) {
    subject = normalizeSuiAddress(querySui);
  }

  if (!subject) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (session && querySui && normalizeSuiAddress(querySui) !== session.suiAddress) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
  }

  try {
    const sb = requireSupabaseAdmin();

    const { data: receipts } = await sb
      .from("consent_receipts")
      .select("id, partner_id, purpose, claims_authorized, created_at, expires_at, revoked_at, request_id")
      .eq("subject_id", subject)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: decisions } = await sb
      .from("verification_decisions")
      .select("id, partner_id, policy_id, decision, decided_at, valid_until, status")
      .eq("subject_id", subject)
      .order("decided_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      subject_id: subject,
      shares: (receipts ?? []).map(r => ({
        id: r.id,
        partner_id: r.partner_id,
        purpose: r.purpose,
        claims_authorized: r.claims_authorized,
        shared_at: r.created_at,
        expires_at: r.expires_at,
        revoked_at: r.revoked_at,
      })),
      decisions: decisions ?? [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Share history unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
