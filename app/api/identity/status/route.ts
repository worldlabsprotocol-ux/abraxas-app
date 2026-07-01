// FILE: app/api/identity/status/route.ts
// Identity stamp status — primary lookup by sui_address (zkLogin), email fallback.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type StatusPayload = {
  status: string;
  via?: string;
  credential_jti?: string | null;
  document_type?: string | null;
  jurisdiction?: string | null;
};

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

async function statusBySui(supabase: SupabaseClient, sui: string): Promise<StatusPayload | null> {
  const { data } = await supabase
    .from("identity_verifications")
    .select("status, credential_jti, document_type, document_country, liveness_provider")
    .or(`wallet_address.eq.${sui},sui_address.eq.${sui}`)
    .maybeSingle();

  if (!data) return null;

  if (data.status === "approved") {
    return {
      status: "approved",
      via: data.liveness_provider === "veriff" ? "veriff" : "verification",
      credential_jti: data.credential_jti,
      document_type: data.document_type,
      jurisdiction: data.document_country,
    };
  }
  if (data.status === "pending") {
    return { status: "pending", via: "veriff" };
  }
  if (data.status === "revoked" || data.status === "suspended") {
    return { status: "declined", via: "veriff" };
  }
  return { status: "not_started" };
}

async function statusByEmail(supabase: SupabaseClient, email: string): Promise<StatusPayload> {
  const { data: veriffRow } = await supabase
    .from("identity_verifications")
    .select("status, credential_jti, liveness_provider")
    .eq("user_email", email)
    .maybeSingle();

  if (veriffRow?.status === "approved") {
    return { status: "approved", via: "veriff", credential_jti: veriffRow.credential_jti };
  }
  if (veriffRow?.status === "pending") {
    return { status: "pending", via: "veriff" };
  }

  const { data: docRow } = await supabase
    .from("passport_documents")
    .select("status")
    .eq("user_email", email)
    .eq("stamp_id", "identity")
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (docRow) {
    return { status: "approved", via: "manual_review" };
  }

  const { data: pendingDoc } = await supabase
    .from("passport_documents")
    .select("status")
    .eq("user_email", email)
    .eq("stamp_id", "identity")
    .in("status", ["submitted", "under_review"])
    .limit(1)
    .maybeSingle();

  if (pendingDoc) {
    return { status: "pending", via: "manual_review" };
  }

  return { status: "not_started" };
}

export async function GET(req: NextRequest) {
  const sui = req.nextUrl.searchParams.get("sui_address")
    ?? req.nextUrl.searchParams.get("sui");
  const email = req.nextUrl.searchParams.get("email");

  if (!sui && !email) {
    return NextResponse.json({ error: "sui_address or email required" }, { status: 400 });
  }

  const supabase = sb();
  if (!supabase) {
    return NextResponse.json({ status: "not_started", dev_mode: true });
  }

  if (sui) {
    const bySui = await statusBySui(supabase, sui);
    if (bySui && bySui.status !== "not_started") {
      return NextResponse.json(bySui);
    }
  }

  if (email) {
    return NextResponse.json(await statusByEmail(supabase, email));
  }

  return NextResponse.json({ status: "not_started" });
}
