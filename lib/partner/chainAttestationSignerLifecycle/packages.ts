import { enqueuePartnerWebhookEvent } from "@/lib/partner/webhooks/webhookOutbox";
import { listDeploymentsForApp, updateDeploymentStatus } from "@/lib/partner/onchainGateDeployments/store";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ChainAttestationSignerRecord, SignerUpdatePackage } from "./contract";
import { insertSignerEvent, insertSignerUpdate } from "./store";
import { assertNoPrivateAttestationSignerMaterial } from "./safety";

function projectPackage(row: {
  update_ref: string;
  deployment_ref: string;
  gate_type: "evm" | "solana";
  network_id: string;
  required_key_ids: string[];
  public_verifiers: SignerUpdatePackage["public_verifiers"];
  deadline: string;
  status: "signer_update_required" | "signer_revoked";
}): SignerUpdatePackage {
  return {
    update_ref: row.update_ref,
    deployment_ref: row.deployment_ref,
    gate_type: row.gate_type,
    network_id: row.network_id,
    required_signer_key_ids: row.required_key_ids,
    public_verifiers: row.public_verifiers,
    deadline: row.deadline,
    status: row.status,
    live: false,
    broadcasts: false,
  };
}

export function serializeSignerUpdatePackage(pkg: SignerUpdatePackage): SignerUpdatePackage {
  if (assertNoPrivateAttestationSignerMaterial(pkg).length) {
    throw new Error("signer_update_redacted");
  }
  return pkg;
}

async function listDeploymentsUsingKey(keyId: string): Promise<Array<Record<string, unknown>>> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.from("onchain_gate_deployments").select("*").eq("signer_key_id", keyId);
  if (error) return [];
  return (data as Record<string, unknown>[] | null) ?? [];
}

export async function createSignerUpdatePackages(input: {
  signer: ChainAttestationSignerRecord;
  toStatus: "retiring" | "revoked";
  requiredKeys: ChainAttestationSignerRecord[];
  deadline?: string;
}): Promise<SignerUpdatePackage[]> {
  const status = input.toStatus === "revoked" ? "signer_revoked" : "signer_update_required";
  const deadline = input.deadline ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await listDeploymentsUsingKey(input.signer.key_id);
  const packages: SignerUpdatePackage[] = [];
  const verifiers = input.requiredKeys.map((key) => ({
    key_id: key.key_id,
    public_verifier: key.public_verifier,
    fingerprint: key.fingerprint,
  }));
  for (const row of rows) {
    const deploymentRef = String(row.deployment_ref);
    const partnerId = String(row.partner_id);
    const applicationId = String(row.application_id);
    await updateDeploymentStatus({
      deploymentRef,
      partnerId,
      status,
    });
    const pkg = serializeSignerUpdatePackage(projectPackage({
      update_ref: `csu_${crypto.randomUUID().replace(/-/g, "")}`,
      deployment_ref: deploymentRef,
      gate_type: row.gate_type as "evm" | "solana",
      network_id: String(row.network_id),
      required_key_ids: input.requiredKeys.map((key) => key.key_id),
      public_verifiers: verifiers,
      deadline,
      status,
    }));
    await insertSignerUpdate({
      update_ref: pkg.update_ref,
      deployment_ref: pkg.deployment_ref,
      partner_id: partnerId,
      application_id: applicationId,
      gate_type: pkg.gate_type,
      network_id: pkg.network_id,
      required_key_ids: pkg.required_signer_key_ids,
      public_verifiers: pkg.public_verifiers,
      deadline: pkg.deadline,
      status: pkg.status,
    });
    await enqueuePartnerWebhookEvent({
      partnerId,
      eventType: "integration.health_changed",
      policyId: null,
      policyVersion: null,
      receiptId: null,
      decisionId: null,
      reasonCode: status,
      outcome: "health_changed",
      resourceId: deploymentRef,
      validityClass: "current",
      expiresAt: deadline,
      eventRef: pkg.update_ref,
      mustReverify: true,
      isGrant: false,
    });
    packages.push(pkg);
  }
  await insertSignerEvent({
    event_id: crypto.randomUUID(),
    signer_ref: input.signer.signer_ref,
    key_id: input.signer.key_id,
    from_status: input.signer.status,
    to_status: input.toStatus,
    reason_class: input.toStatus === "revoked" ? "compromise" : "rotation",
  });
  return packages;
}

export async function listSignerUpdatePackagesForApp(partnerId: string, applicationId: string) {
  const rows = await listDeploymentsForApp({ partnerId, applicationId });
  return rows.map((row) => ({
    deployment_ref: row.deployment_ref,
    status: row.status,
    signer_key_id: row.signer_key_id,
    gate_type: row.gate_type,
    network_id: row.network_id,
  }));
}
