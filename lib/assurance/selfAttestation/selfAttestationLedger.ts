// FILE: lib/assurance/selfAttestation/selfAttestationLedger.ts
// Persist age-band self-attestations only — never DOB.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import type { SelfAttestedAgeBand, SelfAttestationPurpose } from "./constants";
import { resolveSelfAttestedAgeTtlHours } from "./constants";

const TABLE = "self_attestation_ledger";

export interface SelfAttestationLedgerRow {
  id: string;
  holder_ref: string;
  partner_id: string;
  policy_id: string;
  age_band: SelfAttestedAgeBand;
  assurance_level: string;
  provenance: string;
  purpose: SelfAttestationPurpose;
  attested_at: string;
  expires_at: string;
  revoked_at: string | null;
  browse_receipt_id: string | null;
  created_at: string;
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function generateBrowseReceiptId(): string {
  return `br_${randomBytes(12).toString("base64url")}`;
}

export async function insertSelfAttestationRecord(input: {
  holderRef: string;
  partnerId: string;
  policyId: string;
  ageBand: SelfAttestedAgeBand;
  purpose: SelfAttestationPurpose;
  browseReceiptId?: string | null;
  sb?: SupabaseClient;
}): Promise<{ ok: true; row: SelfAttestationLedgerRow } | { ok: false; code: string }> {
  const sb = input.sb ?? getSupabase();
  if (!sb) return { ok: false, code: "supabase_not_configured" };

  const now = new Date();
  const ttlHours = resolveSelfAttestedAgeTtlHours();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const { data, error } = await sb.from(TABLE).insert({
    holder_ref: input.holderRef,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    age_band: input.ageBand,
    assurance_level: "L0",
    provenance: "user_self_attestation",
    purpose: input.purpose,
    attested_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    browse_receipt_id: input.browseReceiptId ?? null,
  }).select("*").single();

  if (error) return { ok: false, code: "insert_failed" };
  return { ok: true, row: data as SelfAttestationLedgerRow };
}

export async function getActiveSelfAttestations(input: {
  holderRef: string;
  partnerId?: string;
  policyId?: string;
  purpose?: SelfAttestationPurpose;
  sb?: SupabaseClient;
}): Promise<SelfAttestationLedgerRow[]> {
  const sb = input.sb ?? getSupabase();
  if (!sb) return [];

  let query = sb
    .from(TABLE)
    .select("*")
    .eq("holder_ref", input.holderRef)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("attested_at", { ascending: false });

  if (input.partnerId) query = query.eq("partner_id", input.partnerId);
  if (input.policyId) query = query.eq("policy_id", input.policyId);
  if (input.purpose) query = query.eq("purpose", input.purpose);

  const { data } = await query;
  return (data as SelfAttestationLedgerRow[] | null) ?? [];
}

export async function getSelfAttestationByReceiptId(
  receiptId: string,
  sb?: SupabaseClient,
): Promise<SelfAttestationLedgerRow | null> {
  const client = sb ?? getSupabase();
  if (!client) return null;
  const { data } = await client
    .from(TABLE)
    .select("*")
    .eq("browse_receipt_id", receiptId)
    .maybeSingle();
  return (data as SelfAttestationLedgerRow | null) ?? null;
}
