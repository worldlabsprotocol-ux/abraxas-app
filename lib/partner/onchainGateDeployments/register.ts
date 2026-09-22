import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import { getEvmGateNetworkPosture } from "@/lib/partner/evmGate/networks";
import { hashAction, hashEnvironment, hashPartnerId, hashPolicy } from "@/lib/partner/chainAttestation/hashes";
import {
  isChainAttestationEvmAction,
  isChainAttestationEvmNetwork,
  isChainAttestationSolanaNetwork,
  CHAIN_ATTESTATION_EVM_TYPE_SCOPES,
  CHAIN_ATTESTATION_SOLANA_SCOPE,
} from "@/lib/partner/chainAttestation/contract";
import type { OnchainGateSafeReason, OnchainGateDeploymentStatus } from "./contract";
import { parseOnchainDeploymentManifest } from "./parseManifest";
import { evmDigestFromManifest, solanaDigestFromManifest } from "./digests";
import {
  resolveEvmAdapter,
  resolveSolanaAdapter,
  verifyEvmAgainstChain,
  verifySolanaAgainstChain,
  type EvmVerificationAdapter,
  type SolanaVerificationAdapter,
} from "./adapters";
import { getDeploymentByRef, insertDeployment, insertDeploymentEvent, listDeploymentsForApp, updateDeploymentStatus, OnchainGateStoreUnavailableError } from "./store";
import { localSolanaFixturesAllowed } from "./adapters";
import type { OnchainDeploymentManifest, OnchainGateDeploymentRecord } from "./types";
import { projectOnchainGatePublic } from "./project";
import { deriveRequireInstitutional } from "./institutional";

export interface RegisterDeploymentInput {
  partnerId: string;
  applicationId: string;
  policyId: string;
  policyVersion: number;
  appEnvironment: "sandbox" | "production";
  manifest: unknown;
  evmAdapter?: EvmVerificationAdapter | null;
  solanaAdapter?: SolanaVerificationAdapter | null;
  forceNoRpc?: boolean;
}

function networkAllows(manifest: OnchainDeploymentManifest): OnchainGateSafeReason | null {
  const entry = getNetworkCapability(manifest.network_id);
  if (!entry) return "network_disabled";
  if (entry.status === "disabled") return "network_disabled";
  if (manifest.network_id === "arc_circle_mainnet") return "network_disabled";
  if (manifest.gate_type === "evm") {
    if (!isChainAttestationEvmNetwork(manifest.network_id) && manifest.network_id !== "arc_circle_testnet") {
      return "network_disabled";
    }
    if (manifest.network_id === "arc_circle_testnet") {
      const posture = getEvmGateNetworkPosture("arc_circle_testnet");
      const rpc = process.env.ABRAXAS_EVM_GATE_VERIFY_RPC_URL?.trim() ?? "";
      if (!posture?.chain_id || !rpc) return "deployment_verification_unavailable";
    }
    if (manifest.network_id === "evm_sandbox" && manifest.chain_id !== 31337) return "network_disabled";
    if (manifest.network_id === "evm_sepolia" && manifest.chain_id !== 11155111) return "network_disabled";
  } else if (!isChainAttestationSolanaNetwork(manifest.network_id)) {
    return "network_disabled";
  }
  return null;
}

function hashesMatch(
  manifest: OnchainDeploymentManifest,
  input: RegisterDeploymentInput,
): OnchainGateSafeReason | null {
  if (hashPartnerId(input.partnerId) !== manifest.partner_hash) return "tenant_mismatch";
  if (hashPolicy(input.policyId, input.policyVersion) !== manifest.policy_hash) return "policy_mismatch";
  if (hashAction(manifest.action_type, manifest.action_scope) !== manifest.action_hash) return "action_mismatch";
  if (manifest.environment !== input.appEnvironment && manifest.environment === "production" && input.appEnvironment === "sandbox") {
    // Production manifests may be submitted from a sandbox Launchpad app for review, but hashes must still pin the declared env.
  }
  if (manifest.gate_type === "evm") {
    if (manifest.action_type === "activate_protocol_access") {
      if (manifest.action_scope !== "sandbox:protocol_access") return "action_mismatch";
    } else {
      if (!isChainAttestationEvmAction(manifest.action_type)) return "action_mismatch";
      const expected = CHAIN_ATTESTATION_EVM_TYPE_SCOPES[manifest.action_type as keyof typeof CHAIN_ATTESTATION_EVM_TYPE_SCOPES];
      if (manifest.action_scope !== expected) return "action_mismatch";
    }
  } else if (manifest.action_type === "activate_protocol_access") {
    if (manifest.action_scope !== "sandbox:protocol_access") return "action_mismatch";
  } else if (manifest.action_type !== "partner_protocol_action" || manifest.action_scope !== CHAIN_ATTESTATION_SOLANA_SCOPE) {
    return "action_mismatch";
  }
  const envHash = hashEnvironment(manifest.environment);
  const digest = manifest.gate_type === "evm"
    ? evmDigestFromManifest(manifest, envHash)
    : solanaDigestFromManifest(manifest, envHash);
  if (digest !== manifest.config_digest) return "config_digest_mismatch";
  return null;
}

function statusAfterVerify(manifest: OnchainDeploymentManifest, entryStatus: string): OnchainGateDeploymentStatus {
  if (manifest.environment === "production" || entryStatus === "production_review_required" || manifest.network_id.endsWith("_mainnet")) {
    return "production_review_required";
  }
  return "verified_sandbox";
}

export async function registerOnchainGateDeployment(input: RegisterDeploymentInput): Promise<
  | { ok: true; record: OnchainGateDeploymentRecord; public: ReturnType<typeof projectOnchainGatePublic> }
  | { ok: false; reason: OnchainGateSafeReason }
> {
  const parsed = parseOnchainDeploymentManifest(input.manifest);
  if (!parsed.ok) return parsed;
  const manifest = parsed.manifest;
  if (input.appEnvironment === "production" || manifest.environment === "production") {
    const { isSandboxInstitutionalProtocolAccessPolicyId } = await import(
      "@/lib/partner/sandboxInstitutionalProtocolAccess"
    );
    if (isSandboxInstitutionalProtocolAccessPolicyId(input.policyId)) {
      return { ok: false, reason: "environment_mismatch" };
    }
  }
  const net = networkAllows(manifest);
  if (net) return { ok: false, reason: net };
  const hashErr = hashesMatch(manifest, input);
  if (hashErr) return { ok: false, reason: hashErr };

  const allowTestAdapters = localSolanaFixturesAllowed();
  const evmAdapter = input.forceNoRpc ? null : resolveEvmAdapter(allowTestAdapters ? input.evmAdapter : undefined);
  const solanaAdapter = input.forceNoRpc ? null : resolveSolanaAdapter(allowTestAdapters ? input.solanaAdapter : undefined);

  let verified:
    | { ok: true; evmObservation?: import("./adapters").EvmChainObservation; solanaObservation?: import("./adapters").SolanaChainObservation }
    | { ok: false; reason: OnchainGateSafeReason };
  if (manifest.gate_type === "evm") {
    const evm = await verifyEvmAgainstChain(manifest, evmAdapter);
    verified = evm.ok ? { ok: true, evmObservation: evm.observation } : evm;
  } else {
    const solana = await verifySolanaAgainstChain(manifest, solanaAdapter);
    verified = solana.ok ? { ok: true, solanaObservation: solana.observation } : solana;
  }

  const now = new Date().toISOString();
  const deploymentRef = `ogd_${crypto.randomUUID().replace(/-/g, "")}`;
  let status: OnchainGateDeploymentStatus = "submitted";
  let reason: OnchainGateSafeReason = "permitted";
  if (!verified.ok) {
    status = verified.reason === "deployment_verification_unavailable" ? "submitted" : "needs_correction";
    reason = verified.reason;
    if (verified.reason === "deployment_verification_unavailable") {
      return { ok: false, reason };
    }
  } else {
    const entry = getNetworkCapability(manifest.network_id)!;
    status = statusAfterVerify(manifest, entry.status);
  }

  const derived = verified.ok
    ? deriveRequireInstitutional({
      gateType: manifest.gate_type,
      policyId: input.policyId,
      evmObservation: verified.evmObservation,
      solanaObservation: verified.solanaObservation,
    })
    : { ok: true as const, require_institutional: false };
  if (!derived.ok) {
    return { ok: false, reason: derived.reason };
  }

  const record: OnchainGateDeploymentRecord = {
    deployment_ref: deploymentRef,
    partner_id: input.partnerId,
    application_id: input.applicationId,
    gate_type: manifest.gate_type,
    network_id: manifest.network_id,
    chain_id: manifest.gate_type === "evm" ? manifest.chain_id : null,
    gate_address: manifest.gate_type === "evm" ? manifest.gate_address : null,
    bytecode_hash: manifest.gate_type === "evm" ? manifest.bytecode_hash : null,
    config_digest: manifest.config_digest,
    program_id: manifest.gate_type === "solana" ? manifest.program_id : null,
    gate_config_pda: manifest.gate_type === "solana" ? manifest.gate_config_pda : null,
    program_digest: manifest.gate_type === "solana" ? manifest.program_digest : null,
    partner_hash: manifest.partner_hash,
    policy_hash: manifest.policy_hash,
    action_hash: manifest.action_hash,
    action_type: manifest.action_type,
    action_scope: manifest.action_scope,
    environment: manifest.environment,
    signer_key_id: manifest.signer_key_id,
    subject_binding_mode: manifest.subject_binding_mode,
    status,
    require_institutional: derived.require_institutional,
    production_reviewed_at: null,
    revoked_at: null,
    created_at: now,
    updated_at: now,
  };

  try {
    await insertDeployment(record);
    await insertDeploymentEvent({
      event_id: crypto.randomUUID(),
      deployment_ref: deploymentRef,
      partner_id: input.partnerId,
      application_id: input.applicationId,
      from_status: "submitted",
      to_status: status,
      reason,
    });
  } catch (error) {
    if (error instanceof OnchainGateStoreUnavailableError) return { ok: false, reason: "store_unavailable" };
    throw error;
  }

  if (!verified.ok) return { ok: false, reason };
  return { ok: true, record, public: projectOnchainGatePublic(record) };
}

export async function revokeOnchainGateDeployment(input: {
  partnerId: string;
  applicationId: string;
  deploymentRef: string;
}): Promise<{ ok: true } | { ok: false; reason: OnchainGateSafeReason }> {
  try {
    const current = await getDeploymentByRef({
      deploymentRef: input.deploymentRef,
      partnerId: input.partnerId,
      applicationId: input.applicationId,
    });
    if (!current) return { ok: false, reason: "application_mismatch" };
    if (current.status === "revoked") return { ok: true };
    const updated = await updateDeploymentStatus({
      deploymentRef: input.deploymentRef,
      partnerId: input.partnerId,
      applicationId: input.applicationId,
      status: "revoked",
      revokedAt: new Date().toISOString(),
    });
    if (!updated) return { ok: false, reason: "application_mismatch" };
    await insertDeploymentEvent({
      event_id: crypto.randomUUID(),
      deployment_ref: input.deploymentRef,
      partner_id: input.partnerId,
      application_id: input.applicationId,
      from_status: current.status,
      to_status: "revoked",
      reason: "revoked",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof OnchainGateStoreUnavailableError) return { ok: false, reason: "store_unavailable" };
    throw error;
  }
}

export async function approveProductionDeployment(input: {
  partnerId: string;
  deploymentRef: string;
}): Promise<{ ok: true } | { ok: false; reason: OnchainGateSafeReason }> {
  try {
    const updated = await updateDeploymentStatus({
      deploymentRef: input.deploymentRef,
      partnerId: input.partnerId,
      status: "verified_production",
      productionReviewedAt: new Date().toISOString(),
    });
    if (!updated) return { ok: false, reason: "invalid" };
    return { ok: true };
  } catch (error) {
    if (error instanceof OnchainGateStoreUnavailableError) return { ok: false, reason: "store_unavailable" };
    throw error;
  }
}

export async function listAppDeployments(partnerId: string, applicationId: string) {
  try {
    return await listDeploymentsForApp({ partnerId, applicationId });
  } catch (error) {
    if (error instanceof OnchainGateStoreUnavailableError) return null;
    throw error;
  }
}
