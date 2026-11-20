import { Connection, PublicKey } from "@solana/web3.js";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import {
  findEntitlementMintConfigPda,
  findTrustedRelyingPartyConfigPda,
} from "@/lib/solana/token2022Entitlement/pda";
import { findProofRegistryPda } from "@/lib/solana/proofContinuity/pda";
import {
  connectedSandboxAttestationsReady,
  connectedSandboxGenesisHash,
  entitlementConsumerProgramSha256,
  proofContinuityProgramSha256,
  readConnectedSandboxPinnedConfig,
} from "./connectedSandboxConfig";
import { verifyDeployedProgramBytecode } from "./verifyDeployedProgramIdentity";

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

async function assertUpgradeableProgramDeployed(
  connection: Connection,
  expectedId: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  let info;
  try {
    info = await connection.getAccountInfo(new PublicKey(expectedId), "confirmed");
  } catch {
    return { ok: false, code: "rpc_unavailable" };
  }
  if (!info?.executable) return { ok: false, code: "program_not_deployed" };
  if (info.owner.toBase58() !== SOLANA_UPGRADEABLE_LOADER) {
    return { ok: false, code: "program_loader_untrusted" };
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

  const expectedGenesis = connectedSandboxGenesisHash();
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

  const proofCheck = await assertUpgradeableProgramDeployed(connection, pinned.proof_continuity_program_id);
  if (!proofCheck.ok) {
    const code =
      proofCheck.code === "rpc_unavailable"
        ? "rpc_unavailable"
        : "proof_continuity_program_unavailable";
    const detail =
      proofCheck.code === "rpc_unavailable"
        ? "Could not reach pinned RPC while checking proof continuity deployment."
        : "Proof continuity program is not deployed at the pinned address.";
    return { ok: false, code, detail };
  }
  const consumerCheck = await assertUpgradeableProgramDeployed(connection, pinned.entitlement_consumer_program_id);
  if (!consumerCheck.ok) {
    const code =
      consumerCheck.code === "rpc_unavailable" ? "rpc_unavailable" : "token2022_unavailable";
    const detail =
      consumerCheck.code === "rpc_unavailable"
        ? "Could not reach pinned RPC while checking entitlement consumer deployment."
        : "Entitlement consumer program is not deployed at the pinned address.";
    return { ok: false, code, detail };
  }

  const proofSha = proofContinuityProgramSha256();
  const consumerSha = entitlementConsumerProgramSha256();
  if (proofSha) {
    const attestation = await verifyDeployedProgramBytecode(
      connection,
      pinned.proof_continuity_program_id,
      proofSha,
    );
    if (!attestation.ok) {
      if (attestation.code === "rpc_unavailable") {
        return { ok: false, code: "rpc_unavailable", detail: "RPC unavailable during proof continuity attestation." };
      }
      return {
        ok: false,
        code: "proof_continuity_program_attestation_mismatch",
        detail: "Deployed proof continuity bytecode does not match operator attestation.",
      };
    }
  }
  if (consumerSha) {
    const attestation = await verifyDeployedProgramBytecode(
      connection,
      pinned.entitlement_consumer_program_id,
      consumerSha,
    );
    if (!attestation.ok) {
      if (attestation.code === "rpc_unavailable") {
        return { ok: false, code: "rpc_unavailable", detail: "RPC unavailable during entitlement consumer attestation." };
      }
      return {
        ok: false,
        code: "entitlement_consumer_program_attestation_mismatch",
        detail: "Deployed entitlement consumer bytecode does not match operator attestation.",
      };
    }
  }

  const adminPk = new PublicKey(pinned.registry_admin);
  const registry = findProofRegistryPda(adminPk);
  const mintConfig = findEntitlementMintConfigPda(registry.address);
  const trustedConfig = findTrustedRelyingPartyConfigPda(new PublicKey(pinned.relying_party_admin));

  let registryInfo;
  let mintConfigInfo;
  let trustedConfigInfo;
  try {
    [registryInfo, mintConfigInfo, trustedConfigInfo] = await Promise.all([
      connection.getAccountInfo(registry.address, "confirmed"),
      connection.getAccountInfo(mintConfig.address, "confirmed"),
      connection.getAccountInfo(trustedConfig.address, "confirmed"),
    ]);
  } catch {
    return { ok: false, code: "rpc_unavailable", detail: "Could not read operator infrastructure accounts." };
  }

  const infrastructureReady = Boolean(registryInfo && mintConfigInfo && trustedConfigInfo);
  const attestationsReady = connectedSandboxAttestationsReady();

  const base = {
    rpc_url: pinned.rpc_url,
    cluster_label: pinned.cluster_label,
    registry_admin: pinned.registry_admin,
    relying_party_admin: pinned.relying_party_admin,
    registry_pda: registry.address.toBase58(),
    entitlement_mint_config_pda: mintConfig.address.toBase58(),
    trusted_config_pda: trustedConfig.address.toBase58(),
  };

  if (!infrastructureReady || !attestationsReady) {
    return {
      ok: true,
      ...base,
      mint_and_consume_actionable: false,
    };
  }

  return {
    ok: true,
    ...base,
    mint_and_consume_actionable: true,
  };
}