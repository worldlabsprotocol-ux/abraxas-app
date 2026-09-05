// FILE: lib/assurance/ageProviders/sessionService.ts
// Age-assurance session persistence with replay prevention.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { AgeAssuranceSessionRecord, AgeAssuranceSessionStatus, AgeBand, AgeThreshold } from "./types";

const TABLE = "age_assurance_sessions";

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function createAgeAssuranceSessionRow(input: {
  sessionNonce: string;
  providerId: string;
  providerSessionId: string;
  subjectSuiAddress: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  requestedThreshold: AgeThreshold;
  expiresAt: string;
  sb?: SupabaseClient;
}): Promise<{ ok: true; session: AgeAssuranceSessionRecord } | { ok: false; error: string }> {
  const sb = input.sb ?? getSupabase();
  if (!sb) return { ok: false, error: "supabase_not_configured" };

  const now = new Date().toISOString();
  const row = {
    session_nonce: input.sessionNonce,
    provider_id: input.providerId,
    provider_session_id: input.providerSessionId,
    subject_sui_address: normalizeSuiAddress(input.subjectSuiAddress),
    partner_id: input.partnerId,
    policy_id: input.policyId,
    return_url: input.returnUrl,
    requested_threshold: input.requestedThreshold,
    status: "pending" as AgeAssuranceSessionStatus,
    expires_at: input.expiresAt,
    updated_at: now,
  };

  const { data, error } = await sb.from(TABLE).insert(row).select("*").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data as AgeAssuranceSessionRecord };
}

export async function getAgeAssuranceSessionByNonce(
  sessionNonce: string,
  sb?: SupabaseClient,
): Promise<AgeAssuranceSessionRecord | null> {
  const client = sb ?? getSupabase();
  if (!client) return null;
  const { data } = await client
    .from(TABLE)
    .select("*")
    .eq("session_nonce", sessionNonce)
    .maybeSingle();
  return (data as AgeAssuranceSessionRecord | null) ?? null;
}

export async function consumeAgeAssuranceCallback(input: {
  sessionNonce: string;
  providerId: string;
  providerSessionId: string;
  subjectSuiAddress: string;
  partnerId: string;
  policyId: string;
  ageBand: AgeBand;
  assuranceLevel: string;
  evidenceRefHash: string;
  verified: boolean;
  reasonCode?: string;
  expiresAt?: string;
  sb?: SupabaseClient;
}): Promise<
  | { ok: true; session: AgeAssuranceSessionRecord; replay: false }
  | { ok: true; session: AgeAssuranceSessionRecord; replay: true }
  | { ok: false; error: string; code: string }
> {
  const sb = input.sb ?? getSupabase();
  if (!sb) return { ok: false, error: "supabase_not_configured", code: "supabase_not_configured" };

  const session = await getAgeAssuranceSessionByNonce(input.sessionNonce, sb);
  if (!session) {
    return { ok: false, error: "session_not_found", code: "session_not_found" };
  }

  if (session.provider_id !== input.providerId) {
    return { ok: false, error: "provider_mismatch", code: "provider_mismatch" };
  }
  if (session.provider_session_id !== input.providerSessionId) {
    return { ok: false, error: "provider_session_mismatch", code: "provider_session_mismatch" };
  }
  if (session.subject_sui_address !== normalizeSuiAddress(input.subjectSuiAddress)) {
    return { ok: false, error: "subject_mismatch", code: "subject_mismatch" };
  }
  if (session.partner_id !== input.partnerId) {
    return { ok: false, error: "partner_mismatch", code: "partner_mismatch" };
  }
  if (session.policy_id !== input.policyId) {
    return { ok: false, error: "policy_mismatch", code: "policy_mismatch" };
  }
  if (new Date(session.expires_at) < new Date()) {
    return { ok: false, error: "session_expired", code: "session_expired" };
  }

  if (session.callback_consumed_at) {
    return { ok: true, session, replay: true };
  }

  const now = new Date().toISOString();
  const status: AgeAssuranceSessionStatus = input.verified ? "completed" : "failed";

  const { data, error } = await sb
    .from(TABLE)
    .update({
      status,
      age_band_result: input.ageBand,
      assurance_level: input.assuranceLevel,
      evidence_ref_hash: input.evidenceRefHash,
      callback_consumed_at: now,
      completed_at: now,
      reason_code: input.reasonCode ?? null,
      updated_at: now,
    })
    .eq("id", session.id)
    .is("callback_consumed_at", null)
    .select("*")
    .single();

  if (error) {
    const refreshed = await getAgeAssuranceSessionByNonce(input.sessionNonce, sb);
    if (refreshed?.callback_consumed_at) {
      return { ok: true, session: refreshed, replay: true };
    }
    return { ok: false, error: error.message, code: "update_failed" };
  }

  return { ok: true, session: data as AgeAssuranceSessionRecord, replay: false };
}
