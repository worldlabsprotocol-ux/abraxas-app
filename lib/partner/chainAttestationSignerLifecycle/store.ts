import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ChainAttestationSignerRecord, SignerUpdatePackage } from "./contract";

export class ChainAttestationSignerStoreUnavailableError extends Error {
  constructor() {
    super("chain_attestation_signer_store_unavailable");
    this.name = "ChainAttestationSignerStoreUnavailableError";
  }
}

function missing(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist");
}

function admin() {
  try {
    return requireSupabaseAdmin();
  } catch {
    throw new ChainAttestationSignerStoreUnavailableError();
  }
}

export async function insertSignerRecord(row: ChainAttestationSignerRecord): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("chain_attestation_signers").insert(row);
  if (missing(error) || error) throw new ChainAttestationSignerStoreUnavailableError();
}

export async function insertSignerEvent(row: {
  event_id: string;
  signer_ref: string;
  key_id: string;
  from_status: string;
  to_status: string;
  reason_class: string;
}): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("chain_attestation_signer_events").insert({
    ...row,
    created_at: new Date().toISOString(),
  });
  if (missing(error) || error) throw new ChainAttestationSignerStoreUnavailableError();
}

export async function insertSignerUpdate(row: {
  update_ref: string;
  deployment_ref: string;
  partner_id: string;
  application_id: string;
  gate_type: string;
  network_id: string;
  required_key_ids: string[];
  public_verifiers: SignerUpdatePackage["public_verifiers"];
  deadline: string;
  status: "signer_update_required" | "signer_revoked";
}): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("chain_attestation_signer_updates").insert({
    ...row,
    created_at: new Date().toISOString(),
  });
  if (missing(error) || error) throw new ChainAttestationSignerStoreUnavailableError();
}

export async function listSignerUpdatesForApp(partnerId: string, applicationId: string): Promise<Record<string, unknown>[]> {
  const sb = admin();
  const { data, error } = await sb
    .from("chain_attestation_signer_updates")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("application_id", applicationId);
  if (missing(error) || error) throw new ChainAttestationSignerStoreUnavailableError();
  return (data as Record<string, unknown>[] | null) ?? [];
}
