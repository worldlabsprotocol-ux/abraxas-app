// FILE: app/api/credentials/share-history/route.ts
// Partner access history — consent receipts for a subject.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const sui = req.nextUrl.searchParams.get("sui");
  if (!sui) {
    return NextResponse.json({ error: "sui query param required" }, { status: 400 });
  }

  try {
    const subject = normalizeSuiAddress(sui);
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
