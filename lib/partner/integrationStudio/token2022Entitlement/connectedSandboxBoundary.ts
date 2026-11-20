import { Connection, PublicKey } from "@solana/web3.js";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";
import {
  findEntitlementMintConfigPda,
  findTrustedRelyingPartyConfigPda,
} from "@/lib/solana/token2022Entitlement/pda";
import { findProofRegistryPda } from "@/lib/solana/proofContinuity/pda";
import { connectedSandboxProgramBytecodeDigest, readConnectedSandboxPinnedConfig } from "./connectedSandboxConfig";

export type ConnectedSandboxBoundaryResult =
  | {
      ok: true;
      rpc_url: string;
      cluster_label: string;
      registry_admin: string;
      relying_party_admin: string;
      mint_and_consume_actionable: boolean;
      registry_pda: string;
      entitlement_mint_config_pda: string;
      trusted_config_pda: string;
    }
  | { ok: false; code: string; detail: string };

function isProductionSurface(): boolean {
  const vercel = process.env.VERCEL_ENV?.trim();
  if (vercel === "production") return true;
  return process.env.NODE_ENV === "production" && vercel !== "preview" && vercel !== "development";
}

async function assertExecutableProgram(
  connection: Connection,
  expectedId: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const info = await connection.getAccountInfo(new PublicKey(expectedId), "confirmed");
  if (!info?.executable) return { ok: false, code: "program_not_deployed" };
  if (!info.owner.toBase58().includes("BPF")) {
    return { ok: false, code: "program_owner_untrusted" };
  }
  return { ok: true };
}

export async function evaluateConnectedSandboxBoundary(): Promise<ConnectedSandboxBoundaryResult> {
  if (isProductionSurface()) {
    return {
      ok: false,
      code: "production_entitlement_unavailable",
      detail: "Connected Token-2022 execution is disabled on production.",
    };
  }

  const pinned = readConnectedSandboxPinnedConfig();
  if (!pinned) {
    return {
      ok: false,
      code: "connected_sandbox_not_configured",
      detail:
        "Set ABRAXAS_PROOF_CONTINUITY_RPC_URL, ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN, ABRAXAS_ENTITLEMENT_RELYING_PARTY_ADMIN, and prepare HMAC.",
    };
  }

  if (
    pinned.proof_continuity_program_id !== PROOF_CONTINUITY_PROGRAM_ID
    || pinned.entitlement_consumer_program_id !== ENTITLEMENT_CONSUMER_PROGRAM_ID
  ) {
    return { ok: false, code: "untrusted_program_id", detail: "Pinned program IDs do not match allowlisted builds." };
  }

  let connection: Connection;
  try {
    connection = new Connection(pinned.rpc_url, { commitment: "confirmed" });
  } catch {
    return { ok: false, code: "rpc_unavailable", detail: "Pinned RPC URL is unreachable." };
  }

  const expectedGenesis = process.env.ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH?.trim();
  if (expectedGenesis) {
    try {
      const genesis = await connection.getGenesisHash();
      if (genesis !== expectedGenesis) {
        return { ok: false, code: "wrong_cluster", detail: "RPC genesis hash does not match pinned cluster identity." };
      }
    } catch {
      return { ok: false, code: "rpc_unavailable", detail: "Could not read cluster genesis from RPC." };
    }
  }

  const proofCheck = await assertExecutableProgram(connection, pinned.proof_continuity_program_id);
  if (!proofCheck.ok) {
    return {
      ok: false,
      code: "proof_continuity_program_unavailable",
      detail: "Proof continuity program is not deployed at the pinned address.",
    };
  }
  const consumerCheck = await assertExecutableProgram(connection, pinned.entitlement_consumer_program_id);
  if (!consumerCheck.ok) {
    return {
      ok: false,
      code: "token2022_unavailable",
      detail: "Entitlement consumer program is not deployed at the pinned address.",
    };
  }

  const digest = connectedSandboxProgramBytecodeDigest();
  if (digest) {
    // Optional operator-controlled deployment attestation (programdata account hash) — skip when unset.
  }

  const adminPk = new PublicKey(pinned.registry_admin);
  const registry = findProofRegistryPda(adminPk);
  const mintConfig = findEntitlementMintConfigPda(registry.address);
  const trustedConfig = findTrustedRelyingPartyConfigPda(new PublicKey(pinned.relying_party_admin));

  const [registryInfo, mintConfigInfo, trustedConfigInfo] = await Promise.all([
    connection.getAccountInfo(registry.address, "confirmed"),
    connection.getAccountInfo(mintConfig.address, "confirmed"),
    connection.getAccountInfo(trustedConfig.address, "confirmed"),
  ]);

  const infrastructureReady = Boolean(registryInfo && mintConfigInfo && trustedConfigInfo);

  if (!infrastructureReady) {
    return {
      ok: true,
      rpc_url: pinned.rpc_url,
      cluster_label: pinned.cluster_label,
      registry_admin: pinned.registry_admin,
      relying_party_admin: pinned.relying_party_admin,
      mint_and_consume_actionable: false,
      registry_pda: registry.address.toBase58(),
      entitlement_mint_config_pda: mintConfig.address.toBase58(),
      trusted_config_pda: trustedConfig.address.toBase58(),
    };
  }

  return {
    ok: true,
    rpc_url: pinned.rpc_url,
    cluster_label: pinned.cluster_label,
    registry_admin: pinned.registry_admin,
    relying_party_admin: pinned.relying_party_admin,
    mint_and_consume_actionable: true,
    registry_pda: registry.address.toBase58(),
    entitlement_mint_config_pda: mintConfig.address.toBase58(),
    trusted_config_pda: trustedConfig.address.toBase58(),
  };
}