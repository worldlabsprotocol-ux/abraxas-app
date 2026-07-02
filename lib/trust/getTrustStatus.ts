// FILE: lib/trust/getTrustStatus.ts
// Unified trust read model for integrators + /passport UI (Phase 4).

import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isPassportIssuerConfigured, getSponsorConfig } from "@/lib/sui/passportIssuer";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface TrustStatus {
  sui_address: string;
  identity: {
    status: string;
    veriff_session_id: string | null;
    via: string | null;
  };
  credential: {
    active: boolean;
    jti: string | null;
    expires_at: string | null;
  };
  on_chain: {
    provisioned: boolean;
    object_id: string | null;
    stamp_bitmask: number;
    stamps_complete: boolean;
  };
  intent: {
    last_verified_at: string | null;
    proofs_count: number;
  };
  infrastructure: {
    veriff_api_configured: boolean;
    signing_configured: boolean;
    sponsor_configured: boolean;
    sponsor_address: string | null;
  };
  ready_to_transact: boolean;
}

export async function getTrustStatus(rawAddress: string): Promise<TrustStatus | null> {
  if (!SB_URL || !SB_KEY) return null;

  const sui = normalizeSuiAddress(rawAddress);
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const sponsor = getSponsorConfig();

  const { data: idv } = await sb
    .from("identity_verifications")
    .select("status, veriff_session_id, credential_jti, liveness_provider")
    .or(`sui_address.eq.${sui},wallet_address.eq.${sui}`)
    .maybeSingle();

  const { data: cred } = await sb
    .from("abraxas_credentials")
    .select("jti, expiration_date, revoked_at")
    .or(`sui_address.eq.${sui},holder_wallet.eq.${sui}`)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: chain } = await sb
    .from("sui_passport_objects")
    .select("object_id, stamp_bitmask")
    .eq("sui_address", sui)
    .maybeSingle();

  const { count: intentCount } = await sb
    .from("intent_challenges")
    .select("id", { count: "exact", head: true })
    .eq("sui_address", sui)
    .eq("verified", true);

  const { data: lastIntent } = await sb
    .from("intent_challenges")
    .select("consumed_at")
    .eq("sui_address", sui)
    .eq("verified", true)
    .order("consumed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const identityApproved = idv?.status === "approved";
  const credentialActive = Boolean(
    cred?.jti && cred.expiration_date && new Date(cred.expiration_date) > new Date(),
  );
  const onChainReady = Boolean(chain?.object_id);
  const stampsComplete = (chain?.stamp_bitmask ?? 0) >= 131;

  return {
    sui_address: sui,
    identity: {
      status: idv?.status ?? "not_started",
      veriff_session_id: idv?.veriff_session_id ?? null,
      via: idv?.liveness_provider ?? null,
    },
    credential: {
      active: credentialActive,
      jti: cred?.jti ?? idv?.credential_jti ?? null,
      expires_at: cred?.expiration_date ?? null,
    },
    on_chain: {
      provisioned: onChainReady,
      object_id: chain?.object_id ?? null,
      stamp_bitmask: chain?.stamp_bitmask ?? 0,
      stamps_complete: stampsComplete,
    },
    intent: {
      last_verified_at: lastIntent?.consumed_at ?? null,
      proofs_count: intentCount ?? 0,
    },
    infrastructure: {
      veriff_api_configured: Boolean(process.env.VERIFF_API_KEY),
      signing_configured: Boolean(process.env.ABRAXAS_SIGNING_KEY),
      sponsor_configured: isPassportIssuerConfigured(),
      sponsor_address: sponsor.sponsor_address,
    },
    ready_to_transact: identityApproved && credentialActive,
  };
}
