// FILE: app/api/identity/status/route.ts
// Identity status with setup state machine fields for Passport onboarding.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  computePassportSetupState,
  resolveCredentialStatus,
  resolveIdentityVerificationStatus,
  type IdentityVerificationStatus,
  type CredentialStatus,
} from "@/lib/idv/identityVerificationStates";
import { getIdvProvider, isVeriffLive } from "@/lib/idv/idvProvider";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { readCanonicalWalletBindingTruth } from "@/lib/trust/readCanonicalWalletBinding";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type StatusPayload = {
  status: string;
  via?: string;
  credential_jti?: string | null;
  document_type?: string | null;
  jurisdiction?: string | null;
  identity_verification_status?: IdentityVerificationStatus;
  credential_status?: CredentialStatus;
  veriff_session_id?: string | null;
  last_verified_at?: string | null;
  credential_issued_at?: string | null;
  expires_at?: string | null;
  error_message?: string | null;
  wallet_binding_l3: boolean;
  wallet_binding_status: "active" | "missing" | "revoked" | "unavailable";
  wallet_binding_read_error?: string;
  setup: ReturnType<typeof computePassportSetupState>;
  veriff_configured: boolean;
  idv_provider: string;
};

type PartialStatusPayload = Omit<
  StatusPayload,
  "wallet_binding_l3" | "wallet_binding_status" | "wallet_binding_read_error" | "setup"
> & {
  wallet_binding_l3?: boolean;
  wallet_binding_status?: StatusPayload["wallet_binding_status"];
  wallet_binding_read_error?: string;
  setup?: ReturnType<typeof computePassportSetupState>;
};

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

function mapLegacyStatusToIdentity(status: string): IdentityVerificationStatus {
  if (status === "approved") return "approved";
  if (status === "requires_resubmission") return "requires_resubmission";
  if (status === "declined") return "declined";
  if (status === "pending") return "in_progress";
  return "not_started";
}

async function finalizeStatusPayload(
  supabase: SupabaseClient,
  sui: string,
  partial: PartialStatusPayload,
): Promise<StatusPayload> {
  const walletTruth = await readCanonicalWalletBindingTruth(sui, supabase);
  const walletBindingL3 = walletTruth.persisted;

  const { data: walletRow } = await supabase
    .from("sui_zklogin_identities")
    .select("sui_address")
    .eq("sui_address", normalizeSuiAddress(sui))
    .maybeSingle();

  const identityStatus = partial.identity_verification_status
    ?? mapLegacyStatusToIdentity(partial.status);
  const credentialStatus = partial.credential_status
    ?? (partial.status === "approved" && partial.credential_jti ? "active" : "not_issued");

  const setup = computePassportSetupState({
    walletDone: Boolean(walletRow),
    identityStatus,
    credentialStatus,
    walletBindingL3,
  });

  return {
    ...partial,
    identity_verification_status: identityStatus,
    credential_status: credentialStatus,
    wallet_binding_l3: walletBindingL3,
    wallet_binding_status: walletTruth.status,
    ...(walletTruth.read_error ? { wallet_binding_read_error: walletTruth.read_error } : {}),
    setup,
    veriff_configured: partial.veriff_configured ?? isVeriffLive(),
    idv_provider: partial.idv_provider ?? getIdvProvider(),
  };
}

async function manualDocStatusBySui(supabase: SupabaseClient, sui: string): Promise<PartialStatusPayload | null> {
  const normalized = normalizeSuiAddress(sui);

  const { data: accepted } = await supabase
    .from("passport_documents")
    .select("status")
    .eq("sui_address", normalized)
    .eq("stamp_id", "identity")
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (accepted) {
    return {
      status: "approved",
      via: "manual_review",
      idv_provider: getIdvProvider(),
      veriff_configured: isVeriffLive(),
    };
  }

  const { data: pending } = await supabase
    .from("passport_documents")
    .select("status")
    .eq("sui_address", normalized)
    .eq("stamp_id", "identity")
    .in("status", ["submitted", "under_review"])
    .limit(1)
    .maybeSingle();

  if (pending) {
    return {
      status: "pending",
      via: "manual_review",
      idv_provider: getIdvProvider(),
      veriff_configured: isVeriffLive(),
    };
  }

  const { data: resubmit } = await supabase
    .from("passport_documents")
    .select("status, reviewer_note, reviewed_at")
    .eq("sui_address", normalized)
    .eq("stamp_id", "identity")
    .eq("status", "resubmission_requested")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resubmit) {
    return {
      status: "requires_resubmission",
      via: "manual_review",
      error_message: resubmit.reviewer_note ?? "Please resubmit your identity documents",
      idv_provider: getIdvProvider(),
      veriff_configured: isVeriffLive(),
    };
  }

  return null;
}

async function statusBySui(supabase: SupabaseClient, sui: string): Promise<PartialStatusPayload | null> {
  const { data } = await supabase
    .from("identity_verifications")
    .select(`
      status, credential_jti, document_type, document_country, liveness_provider,
      identity_verification_status, credential_status, veriff_session_id,
      last_verified_at, credential_issued_at, error_message
    `)
    .or(`wallet_address.eq.${sui},sui_address.eq.${sui}`)
    .maybeSingle();

  if (!data) {
    return manualDocStatusBySui(supabase, sui);
  }

  const idvStatus = resolveIdentityVerificationStatus(data);
  const credStatus = resolveCredentialStatus(data);

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
    : idvStatus === "requires_resubmission" ? "requires_resubmission"
    : idvStatus === "declined" || idvStatus === "expired" || idvStatus === "error" ? "declined"
    : idvStatus === "not_started" ? "not_started"
    : "pending";

  return {
    status: legacyStatus,
    via:
      data.liveness_provider === "veriff"
        ? "veriff"
        : data.liveness_provider === "abraxas_capture" || data.liveness_provider === "manual_review"
          ? "manual_review"
          : "verification",
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
    veriff_configured: isVeriffLive(),
    idv_provider: getIdvProvider(),
  };
}

async function statusByEmail(supabase: SupabaseClient, email: string): Promise<PartialStatusPayload> {
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
    return {
      status: "approved",
      via: "veriff",
      credential_jti: veriffRow.credential_jti,
      veriff_configured: isVeriffLive(),
      idv_provider: getIdvProvider(),
    };
  }
  if (veriffRow?.status === "pending") {
    return {
      status: "pending",
      via: "veriff",
      veriff_configured: isVeriffLive(),
      idv_provider: getIdvProvider(),
    };
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
    return {
      status: "approved",
      via: "manual_review",
      idv_provider: getIdvProvider(),
      veriff_configured: isVeriffLive(),
    };
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
    return {
      status: "pending",
      via: "manual_review",
      idv_provider: getIdvProvider(),
      veriff_configured: isVeriffLive(),
    };
  }

  const { data: resubmitDoc } = await supabase
    .from("passport_documents")
    .select("status, reviewer_note")
    .eq("user_email", email)
    .eq("stamp_id", "identity")
    .eq("status", "resubmission_requested")
    .limit(1)
    .maybeSingle();

  if (resubmitDoc) {
    return {
      status: "requires_resubmission",
      via: "manual_review",
      error_message: resubmitDoc.reviewer_note ?? "Please resubmit your identity documents",
      idv_provider: getIdvProvider(),
      veriff_configured: isVeriffLive(),
    };
  }

  return {
    status: "not_started",
    veriff_configured: isVeriffLive(),
    idv_provider: getIdvProvider(),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sui = auth.session.suiAddress;
  const requested = req.nextUrl.searchParams.get("sui_address")
    ?? req.nextUrl.searchParams.get("sui");
  if (requested) {
    try {
      if (normalizeSuiAddress(requested) !== sui) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid sui query param" }, { status: 400 });
    }
  }

  const email = req.nextUrl.searchParams.get("email");
  if (email) {
    const supabase = sb();
    if (supabase) {
      const { data: identity } = await supabase
        .from("sui_zklogin_identities")
        .select("email")
        .eq("sui_address", sui)
        .maybeSingle();
      const sessionEmail = identity?.email?.trim().toLowerCase();
      if (!sessionEmail || sessionEmail !== email.trim().toLowerCase()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const supabase = sb();
  if (!supabase) {
    const walletTruth = await readCanonicalWalletBindingTruth(sui);
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: walletTruth.persisted,
    });
    return NextResponse.json({
      status: "not_started",
      dev_mode: true,
      idv_provider: getIdvProvider(),
      veriff_configured: isVeriffLive(),
      wallet_binding_l3: walletTruth.persisted,
      wallet_binding_status: walletTruth.status,
      ...(walletTruth.read_error ? { wallet_binding_read_error: walletTruth.read_error } : {}),
      setup,
    });
  }

  const bySui = await statusBySui(supabase, sui);
  if (bySui) {
    return NextResponse.json(await finalizeStatusPayload(supabase, sui, bySui));
  }

  if (email) {
    const byEmail = await statusByEmail(supabase, email);
    return NextResponse.json(await finalizeStatusPayload(supabase, sui, byEmail));
  }

  return NextResponse.json(await finalizeStatusPayload(supabase, sui, {
    status: "not_started",
    veriff_configured: isVeriffLive(),
    idv_provider: getIdvProvider(),
  }));
}
