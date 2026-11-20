import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";
import {
  blockchainNativeRegistryAdmin,
  blockchainNativeStudioRpcUrl,
  isBlockchainNativeStudioConfigured,
} from "@/lib/partner/launchpad/blockchainNative/studioConfig";

export type ConnectedSandboxPinnedConfig = {
  rpc_url: string;
  cluster_label: string;
  registry_admin: string;
  relying_party_admin: string;
  proof_continuity_program_id: string;
  entitlement_consumer_program_id: string;
  token_program_id: string;
  /** Optional sha256 hex of deployed program bytecode for fail-closed allowlist. */
  program_bytecode_sha256_hex: string | null;
};

function pinnedClusterLabel(): string {
  return process.env.ABRAXAS_CONNECTED_SANDBOX_CLUSTER?.trim() || "pinned_sandbox";
}

export function entitlementRelyingPartyAdmin(): string | null {
  return process.env.ABRAXAS_ENTITLEMENT_RELYING_PARTY_ADMIN?.trim() || null;
}

export function connectedSandboxProgramBytecodeDigest(): string | null {
  const raw = process.env.ABRAXAS_CONNECTED_SANDBOX_PROGRAM_SHA256?.trim();
  if (!raw) return null;
  return /^[0-9a-f]{64}$/i.test(raw) ? raw.toLowerCase() : null;
}

export function readConnectedSandboxPinnedConfig(): ConnectedSandboxPinnedConfig | null {
  const rpc = blockchainNativeStudioRpcUrl();
  const registryAdmin = blockchainNativeRegistryAdmin();
  const relyingPartyAdmin = entitlementRelyingPartyAdmin();
  if (!isBlockchainNativeStudioConfigured() || !rpc || !registryAdmin || !relyingPartyAdmin) return null;
  const proofId = process.env.ABRAXAS_PROOF_CONTINUITY_PROGRAM_ID?.trim() || PROOF_CONTINUITY_PROGRAM_ID;
  const consumerId =
    process.env.ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_ID?.trim() || ENTITLEMENT_CONSUMER_PROGRAM_ID;
  if (proofId !== PROOF_CONTINUITY_PROGRAM_ID || consumerId !== ENTITLEMENT_CONSUMER_PROGRAM_ID) {
    return null;
  }
  return {
    rpc_url: rpc,
    cluster_label: pinnedClusterLabel(),
    registry_admin: registryAdmin,
    relying_party_admin: relyingPartyAdmin,
    proof_continuity_program_id: proofId,
    entitlement_consumer_program_id: consumerId,
    token_program_id: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    program_bytecode_sha256_hex: connectedSandboxProgramBytecodeDigest(),
  };
}