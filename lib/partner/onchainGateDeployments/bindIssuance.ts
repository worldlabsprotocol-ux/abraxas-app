import { hashAction, hashEnvironment, hashPartnerId, hashPolicy, hashSignerKeyId } from "@/lib/partner/chainAttestation/hashes";
import type { ChainAttestationSafeReason } from "@/lib/partner/chainAttestation/contract";
import { getDeploymentByRef, OnchainGateStoreUnavailableError } from "./store";
import type { OnchainGateDeploymentRecord } from "./types";
import { ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV } from "./contract";
import { resolveEvmAdapter, resolveSolanaAdapter, verifyEvmAgainstChain, verifySolanaAgainstChain } from "./adapters";
import { parseOnchainDeploymentManifest } from "./parseManifest";
import { observedRequireInstitutional } from "./institutional";

export interface LocalIssuanceTestAdapter {
  source: "local_anvil" | "solana_program_test";
  chainId?: number;
  verifyingContract?: `0x${string}`;
  programId?: string;
  gateConfigPda?: string;
  configDigest?: `0x${string}`;
}

export type BoundDeployment =
  | {
      ok: true;
      record: OnchainGateDeploymentRecord | null;
      chainId?: number;
      verifyingContract?: `0x${string}`;
      programId?: string;
      gateConfigPda?: string;
    }
  | { ok: false; reason: ChainAttestationSafeReason };

function mapIssuanceDenied(status: OnchainGateDeploymentRecord["status"], kitEnv: "sandbox" | "production"): ChainAttestationSafeReason {
  if (status === "revoked") return "deployment_revoked";
  if (status === "signer_revoked") return "signer_revoked";
  if (status === "signer_update_required") return "signer_update_required";
  if (status === "submitted" || status === "needs_correction") return "deployment_not_verified";
  if (status === "production_review_required") return "production_review_required";
  if (kitEnv === "sandbox" && status !== "verified_sandbox") return "deployment_not_verified";
  if (kitEnv === "production" && status !== "verified_production") return "production_review_required";
  return "deployment_not_verified";
}

export async function bindIssuanceToVerifiedDeployment(input: {
  partnerId: string;
  applicationId: string;
  deploymentRef?: string;
  networkId: string;
  actionType: string;
  actionScope: string;
  kitEnvironment: "sandbox" | "production";
  policyId: string;
  policyVersion: number;
  signerKeyId: string;
  institutionalRequired?: boolean;
  testAdapter?: LocalIssuanceTestAdapter;
}): Promise<BoundDeployment> {
  if (input.testAdapter && process.env[ONCHAIN_DEPLOYMENT_TEST_ADAPTER_ENV] === "1") {
    const vercel = Boolean(process.env.VERCEL);
    const productionRuntime = process.env.NODE_ENV === "production";
    if (vercel || productionRuntime || input.kitEnvironment === "production") {
      return { ok: false, reason: "deployment_not_verified" };
    }
    return {
      ok: true,
      record: null,
      chainId: input.testAdapter.chainId,
      verifyingContract: input.testAdapter.verifyingContract,
      programId: input.testAdapter.programId,
      gateConfigPda: input.testAdapter.gateConfigPda,
    };
  }
  const ref = input.deploymentRef?.trim() ?? "";
  if (!ref) return { ok: false, reason: "deployment_not_verified" };
  let record: OnchainGateDeploymentRecord | null;
  try {
    record = await getDeploymentByRef({
      deploymentRef: ref,
      partnerId: input.partnerId,
      applicationId: input.applicationId,
    });
  } catch (error) {
    if (error instanceof OnchainGateStoreUnavailableError) return { ok: false, reason: "store_unavailable" };
    throw error;
  }
  if (!record) return { ok: false, reason: "deployment_not_verified" };
  if (record.partner_id !== input.partnerId) return { ok: false, reason: "partner_mismatch" };
  if (record.network_id !== input.networkId) return { ok: false, reason: "deployment_mismatch" };
  if (record.action_type !== input.actionType || record.action_scope !== input.actionScope) {
    return { ok: false, reason: "action_mismatch" };
  }
  if (record.partner_hash !== hashPartnerId(input.partnerId)) return { ok: false, reason: "partner_mismatch" };
  if (record.policy_hash !== hashPolicy(input.policyId, input.policyVersion)) return { ok: false, reason: "policy_mismatch" };
  if (record.action_hash !== hashAction(input.actionType, input.actionScope)) return { ok: false, reason: "action_mismatch" };
  if (record.environment !== input.kitEnvironment) return { ok: false, reason: "environment_mismatch" };
  if (hashEnvironment(record.environment) !== hashEnvironment(input.kitEnvironment)) {
    return { ok: false, reason: "environment_mismatch" };
  }
  if (hashSignerKeyId(record.signer_key_id) !== hashSignerKeyId(input.signerKeyId)) {
    return { ok: false, reason: "deployment_mismatch" };
  }
  if (record.status === "revoked" || record.revoked_at) return { ok: false, reason: "deployment_revoked" };
  if (record.status === "signer_revoked") return { ok: false, reason: "signer_revoked" };
  if (record.status === "signer_update_required") return { ok: false, reason: "signer_update_required" };

  if (input.kitEnvironment === "sandbox") {
    if (record.status !== "verified_sandbox") return { ok: false, reason: mapIssuanceDenied(record.status, "sandbox") };
  } else if (record.status !== "verified_production" || !record.production_reviewed_at) {
    return { ok: false, reason: "production_review_required" };
  }

  const requestedInstitutional = input.institutionalRequired === true;
  if (record.require_institutional !== requestedInstitutional) {
    return { ok: false, reason: "institutional_required" };
  }

  // A verified database row is a snapshot. Re-observe the deployed code and
  // configuration before signing, so an upgrade or config change cannot use
  // an old deployment_ref as continuing authority.
  const parsed = parseOnchainDeploymentManifest({
    schema_version: 1,
    gate_type: record.gate_type,
    network_id: record.network_id,
    ...(record.gate_type === "evm"
      ? { chain_id: record.chain_id, gate_address: record.gate_address, bytecode_hash: record.bytecode_hash }
      : { program_id: record.program_id, gate_config_pda: record.gate_config_pda, program_digest: record.program_digest }),
    config_digest: record.config_digest,
    partner_hash: record.partner_hash,
    policy_hash: record.policy_hash,
    action_hash: record.action_hash,
    action_type: record.action_type,
    action_scope: record.action_scope,
    environment: record.environment,
    signer_key_id: record.signer_key_id,
    subject_binding_mode: record.subject_binding_mode,
  });
  if (!parsed.ok) return { ok: false, reason: "deployment_mismatch" };

  try {
    if (parsed.manifest.gate_type === "evm") {
      const verified = await verifyEvmAgainstChain(parsed.manifest, resolveEvmAdapter());
      if (!verified.ok) return { ok: false, reason: verified.reason === "deployment_verification_unavailable" ? verified.reason : "deployment_mismatch" };
      if (observedRequireInstitutional({ gateType: "evm", evmObservation: verified.observation }) !== record.require_institutional) {
        return { ok: false, reason: "deployment_mismatch" };
      }
    } else {
      const verified = await verifySolanaAgainstChain(parsed.manifest, resolveSolanaAdapter());
      if (!verified.ok) return { ok: false, reason: verified.reason === "deployment_verification_unavailable" ? verified.reason : "deployment_mismatch" };
      if (observedRequireInstitutional({ gateType: "solana", solanaObservation: verified.observation }) !== record.require_institutional) {
        return { ok: false, reason: "deployment_mismatch" };
      }
    }
  } catch {
    return { ok: false, reason: "deployment_verification_unavailable" };
  }

  return {
    ok: true,
    record,
    chainId: record.chain_id ?? undefined,
    verifyingContract: record.gate_address as `0x${string}` | undefined,
    programId: record.program_id ?? undefined,
    gateConfigPda: record.gate_config_pda ?? undefined,
  };
}
