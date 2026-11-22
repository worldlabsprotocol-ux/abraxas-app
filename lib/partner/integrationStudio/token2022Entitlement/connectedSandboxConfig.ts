import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";
import devnetIdentityManifest from "@/solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json";
import { PublicKey } from "@solana/web3.js";
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
  genesis_hash: string | null;
  proof_continuity_program_sha256_hex: string | null;
  entitlement_consumer_program_sha256_hex: string | null;
};

function pinnedClusterLabel(): string {
  return process.env.ABRAXAS_CONNECTED_SANDBOX_CLUSTER?.trim() || "pinned_sandbox";
}

const devnetIdentity: {
  status: string;
  genesis_hash: string;
  proof_continuity_program_id: string | null;
  entitlement_consumer_program_id: string | null;
} = devnetIdentityManifest;

/** Only a committed, reviewed Devnet identity pair can replace the historical local pins. */
function validProgramId(value: string): boolean {
  try {
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
}

export function connectedProgramIdsApproved(input: {
  clusterLabel: string;
  genesisHash: string | null;
  proofId: string;
  consumerId: string;
}): boolean {
  if (input.clusterLabel !== "solana_devnet") {
    return input.proofId === PROOF_CONTINUITY_PROGRAM_ID
      && input.consumerId === ENTITLEMENT_CONSUMER_PROGRAM_ID;
  }
  return devnetIdentity.status === "approved"
    && typeof devnetIdentity.proof_continuity_program_id === "string"
    && typeof devnetIdentity.entitlement_consumer_program_id === "string"
    && input.genesisHash === devnetIdentity.genesis_hash
    && input.proofId === devnetIdentity.proof_continuity_program_id
    && input.consumerId === devnetIdentity.entitlement_consumer_program_id
    && input.proofId !== input.consumerId
    && validProgramId(input.proofId)
    && validProgramId(input.consumerId);
}

export function entitlementRelyingPartyAdmin(): string | null {
  return process.env.ABRAXAS_ENTITLEMENT_RELYING_PARTY_ADMIN?.trim() || null;
}

function parseSha256HexEnv(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  return /^[0-9a-f]{64}$/i.test(raw) ? raw.toLowerCase() : null;
}

/** Pinned cluster genesis hash — required before connected execution is actionable. */
export function connectedSandboxGenesisHash(): string | null {
  const raw = process.env.ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export function proofContinuityProgramSha256(): string | null {
  return (
    parseSha256HexEnv("ABRAXAS_PROOF_CONTINUITY_PROGRAM_SHA256")
    ?? parseSha256HexEnv("ABRAXAS_CONNECTED_SANDBOX_PROGRAM_SHA256")
  );
}

export function entitlementConsumerProgramSha256(): string | null {
  return (
    parseSha256HexEnv("ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_SHA256")
    ?? parseSha256HexEnv("ABRAXAS_CONNECTED_SANDBOX_PROGRAM_SHA256")
  );
}

/** @deprecated Prefer per-program SHA-256 env vars. */
export function connectedSandboxProgramBytecodeDigest(): string | null {
  return parseSha256HexEnv("ABRAXAS_CONNECTED_SANDBOX_PROGRAM_SHA256");
}

export function connectedSandboxAttestationsReady(): boolean {
  return Boolean(
    connectedSandboxGenesisHash()
    && proofContinuityProgramSha256()
    && entitlementConsumerProgramSha256(),
  );
}

export function readConnectedSandboxPinnedConfig(): ConnectedSandboxPinnedConfig | null {
  const rpc = blockchainNativeStudioRpcUrl();
  const registryAdmin = blockchainNativeRegistryAdmin();
  const relyingPartyAdmin = entitlementRelyingPartyAdmin();
  if (!isBlockchainNativeStudioConfigured() || !rpc || !registryAdmin || !relyingPartyAdmin) return null;
  const proofId = process.env.ABRAXAS_PROOF_CONTINUITY_PROGRAM_ID?.trim() || PROOF_CONTINUITY_PROGRAM_ID;
  const consumerId =
    process.env.ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_ID?.trim() || ENTITLEMENT_CONSUMER_PROGRAM_ID;
  if (!connectedProgramIdsApproved({
    clusterLabel: pinnedClusterLabel(),
    genesisHash: connectedSandboxGenesisHash(),
    proofId,
    consumerId,
  })) {
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
    genesis_hash: connectedSandboxGenesisHash(),
    proof_continuity_program_sha256_hex: proofContinuityProgramSha256(),
    entitlement_consumer_program_sha256_hex: entitlementConsumerProgramSha256(),
  };
}
