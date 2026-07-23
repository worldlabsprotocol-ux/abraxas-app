// FILE: lib/authenticationProof/persistAuthenticationProof.ts
// Persist proofs to Supabase — minimal fallback if lifecycle migrations pending.

import { createClient } from "@supabase/supabase-js";
import type { AnchorStatus } from "./types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface PersistProofInput {
  id: string;
  event_type: string;
  record_id: string;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
  sui_tx_digest: string | null;
  sui_network: string;
  anchor_status: AnchorStatus;
  explorer_url: string | null;
  issued_at: string;
  schema_version: string;
  network: string;
  status: string;
  asset_abx_id: string | null;
  superseded_by: string | null;
}

export interface PersistProofResult {
  ok: boolean;
  error?: string;
  hint?: string;
}

export async function persistAuthenticationProof(input: PersistProofInput): Promise<PersistProofResult> {
  if (!SB_URL || !SB_KEY) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const fullRow = {
    id: input.id,
    event_type: input.event_type,
    record_id: input.record_id,
    payload_hash: input.payload_hash,
    signature: input.signature,
    signing_key_id: input.signing_key_id,
    sui_tx_digest: input.sui_tx_digest,
    sui_network: input.sui_network,
    anchor_status: input.anchor_status,
    explorer_url: input.explorer_url,
    issued_at: input.issued_at,
    schema_version: input.schema_version,
    network: input.network,
    status: input.status,
    asset_abx_id: input.asset_abx_id,
    superseded_by: input.superseded_by,
  };

  const { error: fullError } = await sb.from("authentication_proofs").insert(fullRow);

  if (!fullError) return { ok: true };

  const minimalRow = {
    id: input.id,
    event_type: input.event_type,
    record_id: input.record_id,
    payload_hash: input.payload_hash,
    signature: input.signature,
    signing_key_id: input.signing_key_id,
    sui_tx_digest: input.sui_tx_digest,
    sui_network: input.sui_network,
    anchor_status: input.anchor_status,
    explorer_url: input.explorer_url,
  };

  const { error: minError } = await sb.from("authentication_proofs").insert(minimalRow);

  if (!minError) {
    return {
      ok: true,
      hint: "Persisted with base schema only — run migrations 043–044 for lifecycle columns.",
    };
  }

  const message = minError.message ?? fullError.message ?? "insert_failed";
  const hint = message.includes("authentication_proofs")
    ? "Run Supabase migrations 042–044 (authentication_proofs table)."
    : message.includes("column")
      ? "Run Supabase migrations 043–044 (issued_at, status, asset_abx_id columns)."
      : undefined;

  console.error("[persistAuthenticationProof]", fullError.message, minError.message);

  return { ok: false, error: message, hint };
}

export async function checkAuthenticationProofsTable(): Promise<{
  readable: boolean;
  writable: boolean;
  error?: string;
  hint?: string;
}> {
  if (!SB_URL || !SB_KEY) {
    return { readable: false, writable: false, error: "supabase_not_configured" };
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const probeId = `aprx_probe_${Date.now()}`;

  const { error: readError } = await sb.from("authentication_proofs").select("id").limit(1);
  if (readError) {
    return {
      readable: false,
      writable: false,
      error: readError.message,
      hint: "Run migration 042_authentication_proofs.sql in Supabase SQL editor.",
    };
  }

  const { error: writeError } = await sb.from("authentication_proofs").insert({
    id: probeId,
    event_type: "credential_verify",
    record_id: "bootstrap-probe",
    payload_hash: "0".repeat(64),
    signature: "probe",
    signing_key_id: "probe",
    anchor_status: "signed",
  });

  if (writeError) {
    return {
      readable: true,
      writable: false,
      error: writeError.message,
      hint: "Table exists but insert failed — check RLS and migrations 042–044.",
    };
  }

  await sb.from("authentication_proofs").delete().eq("id", probeId);

  return { readable: true, writable: true };
}
