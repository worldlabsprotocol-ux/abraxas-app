import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { OnchainGateDeploymentStatus } from "./contract";
import type { OnchainGateDeploymentRecord } from "./types";

export class OnchainGateStoreUnavailableError extends Error {
  constructor() {
    super("onchain_gate_store_unavailable");
    this.name = "OnchainGateStoreUnavailableError";
  }
}

function isSchemaMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist");
}

function mapRow(row: Record<string, unknown>): OnchainGateDeploymentRecord {
  return {
    deployment_ref: String(row.deployment_ref),
    partner_id: String(row.partner_id),
    application_id: String(row.application_id),
    gate_type: row.gate_type as OnchainGateDeploymentRecord["gate_type"],
    network_id: String(row.network_id),
    chain_id: row.chain_id == null ? null : Number(row.chain_id),
    gate_address: row.gate_address == null ? null : String(row.gate_address),
    bytecode_hash: row.bytecode_hash == null ? null : String(row.bytecode_hash),
    config_digest: String(row.config_digest),
    program_id: row.program_id == null ? null : String(row.program_id),
    partner_program_id: row.partner_program_id == null ? null : String(row.partner_program_id),
    gate_config_pda: row.gate_config_pda == null ? null : String(row.gate_config_pda),
    program_digest: row.program_digest == null ? null : String(row.program_digest),
    partner_hash: String(row.partner_hash),
    policy_hash: String(row.policy_hash),
    action_hash: String(row.action_hash),
    action_type: String(row.action_type),
    action_scope: String(row.action_scope),
    environment: row.environment as "sandbox" | "production",
    signer_key_id: String(row.signer_key_id),
    subject_binding_mode: row.subject_binding_mode as OnchainGateDeploymentRecord["subject_binding_mode"],
    status: row.status as OnchainGateDeploymentStatus,
    require_institutional: row.require_institutional === true,
    production_reviewed_at: row.production_reviewed_at == null ? null : String(row.production_reviewed_at),
    revoked_at: row.revoked_at == null ? null : String(row.revoked_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function admin() {
  try {
    return requireSupabaseAdmin();
  } catch {
    throw new OnchainGateStoreUnavailableError();
  }
}

export async function insertDeployment(row: OnchainGateDeploymentRecord): Promise<OnchainGateDeploymentRecord> {
  const sb = admin();
  const { error } = await sb.from("onchain_gate_deployments").insert(row);
  if (isSchemaMissing(error) || error) throw new OnchainGateStoreUnavailableError();
  return row;
}

export async function insertDeploymentEvent(input: {
  event_id: string;
  deployment_ref: string;
  partner_id: string;
  application_id: string;
  from_status: string;
  to_status: string;
  reason: string;
}): Promise<void> {
  const sb = admin();
  const { error } = await sb.from("onchain_gate_deployment_events").insert({
    ...input,
    created_at: new Date().toISOString(),
  });
  if (isSchemaMissing(error) || error) throw new OnchainGateStoreUnavailableError();
}

export async function getDeploymentByRef(input: {
  deploymentRef: string;
  partnerId: string;
  applicationId?: string;
}): Promise<OnchainGateDeploymentRecord | null> {
  const sb = admin();
  let q = sb.from("onchain_gate_deployments").select("*").eq("deployment_ref", input.deploymentRef).eq("partner_id", input.partnerId);
  if (input.applicationId) q = q.eq("application_id", input.applicationId);
  const { data, error } = await q.maybeSingle();
  if (isSchemaMissing(error)) throw new OnchainGateStoreUnavailableError();
  if (error) throw new OnchainGateStoreUnavailableError();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function listDeploymentsForApp(input: {
  partnerId: string;
  applicationId: string;
}): Promise<OnchainGateDeploymentRecord[]> {
  const sb = admin();
  const { data, error } = await sb
    .from("onchain_gate_deployments")
    .select("*")
    .eq("partner_id", input.partnerId)
    .eq("application_id", input.applicationId);
  if (isSchemaMissing(error) || error) throw new OnchainGateStoreUnavailableError();
  return ((data as Record<string, unknown>[] | null) ?? []).map(mapRow);
}

export async function updateDeploymentStatus(input: {
  deploymentRef: string;
  partnerId: string;
  applicationId?: string;
  status: OnchainGateDeploymentStatus;
  productionReviewedAt?: string | null;
  revokedAt?: string | null;
}): Promise<OnchainGateDeploymentRecord | null> {
  const sb = admin();
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.productionReviewedAt !== undefined) patch.production_reviewed_at = input.productionReviewedAt;
  if (input.revokedAt !== undefined) patch.revoked_at = input.revokedAt;
  let query = sb
    .from("onchain_gate_deployments")
    .update(patch)
    .eq("deployment_ref", input.deploymentRef)
    .eq("partner_id", input.partnerId);
  if (input.applicationId) query = query.eq("application_id", input.applicationId);
  const { error } = await query;
  if (isSchemaMissing(error) || error) throw new OnchainGateStoreUnavailableError();
  return getDeploymentByRef({
    deploymentRef: input.deploymentRef,
    partnerId: input.partnerId,
    applicationId: input.applicationId,
  });
}
