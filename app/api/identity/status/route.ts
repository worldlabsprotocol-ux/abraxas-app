// FILE: app/api/identity/status/route.ts
// Identity status with setup state machine fields for Passport onboarding.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  computePassportSetupState,
  resolveCredentialStatus,
  resolveIdentityVerificationStatus,
} from "@/lib/idv/identityVerificationStates";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type StatusPayload = {
  status: string;
  via?: string;
  credential_jti?: string | null;
  document_type?: string | null;
  jurisdiction?: string | null;
  identity_verification_status?: string;
  credential_status?: string;
  veriff_session_id?: string | null;
  last_verified_at?: string | null;
  credential_issued_at?: string | null;
  expires_at?: string | null;
  error_message?: string | null;
  wallet_binding_l3?: boolean;
  setup?: ReturnType<typeof computePassportSetupState>;
  veriff_configured?: boolean;
};

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

async function walletBindingL3(supabase: SupabaseClient, sui: string): Promise<boolean> {
  const normalized = normalizeSuiAddress(sui);
  const { data } = await supabase
    .from("wallet_bindings")
    .select("binding_method")
    .eq("subject_id", normalized)
    .eq("wallet_address", normalized)
    .is("revoked_at", null)
    .maybeSingle();
  return data?.binding_method === "signed_challenge";
}

async function statusBySui(supabase: SupabaseClient, sui: string): Promise<StatusPayload | null> {
  const { data } = await supabase
    .from("identity_verifications")
    .select(`
      status, credential_jti, document_type, document_country, liveness_provider,
      identity_verification_status, credential_status, veriff_session_id,
      last_verified_at, credential_issued_at, error_message
    `)
    .or(`wallet_address.eq.${sui},sui_address.eq.${sui}`)
    .maybeSingle();

  if (!data) return null;

  const idvStatus = resolveIdentityVerificationStatus(data);
  const credStatus = resolveCredentialStatus(data);
  const l3 = await walletBindingL3(supabase, sui);

  let expires_at: string | null = null;
  if (data.credential_jti) {
    const { data: cred } = await supabase
      .from("abraxas_credentials")
      .select("expiration_date")
      .eq("jti", data.credential_jti)
      .maybeSingle();
    expires_at = cred?.expiration_date ?? null;
  }

  const legacyStatus =
    idvStatus === "approved" && credStatus === "active" ? "approved"
    : idvStatus === "declined" || idvStatus === "expired" || idvStatus === "error" ? "declined"
    : idvStatus === "not_started" ? "not_started"
    : "pending";

  const { data: walletRow } = await supabase
    .from("sui_zklogin_identities")
    .select("sui_address")
    .eq("sui_address", normalizeSuiAddress(sui))
    .maybeSingle();

  const setup = computePassportSetupState({
    walletDone: Boolean(walletRow),
    identityStatus: idvStatus,
    credentialStatus: credStatus,
    walletBindingL3: l3,
  });

  return {
    status: legacyStatus,
    via: data.liveness_provider === "veriff" ? "veriff" : "verification",
    credential_jti: data.credential_jti,
    document_type: data.document_type,
    jurisdiction: data.document_country,
    identity_verification_status: idvStatus,
    credential_status: credStatus,
    veriff_session_id: data.veriff_session_id,
    last_verified_at: data.last_verified_at,
    credential_issued_at: data.credential_issued_at,
    expires_at,
    error_message: data.error_message,
    wallet_binding_l3: l3,
    setup,
    veriff_configured: Boolean(process.env.VERIFF_API_KEY),
  };
}

async function statusByEmail(supabase: SupabaseClient, email: string): Promise<StatusPayload> {
  const { data: veriffRow } = await supabase
    .from("identity_verifications")
    .select("status, credential_jti, liveness_provider, sui_address, identity_verification_status, credential_status")
    .eq("user_email", email)
    .maybeSingle();

  if (veriffRow?.sui_address) {
    const bySui = await statusBySui(supabase, veriffRow.sui_address);
    if (bySui) return bySui;
  }

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

  return { status: "not_started", veriff_configured: Boolean(process.env.VERIFF_API_KEY) };
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
    if (bySui) return NextResponse.json(bySui);
  }

  if (email) {
    return NextResponse.json(await statusByEmail(supabase, email));
  }

  return NextResponse.json({
    status: "not_started",
    veriff_configured: Boolean(process.env.VERIFF_API_KEY),
  });
}
