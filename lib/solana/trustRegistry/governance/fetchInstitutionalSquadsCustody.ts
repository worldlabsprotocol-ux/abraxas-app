import {
  parseInstitutionalCustodyFromEnv,
  type InstitutionalCustodyEnvConfig,
} from "@/lib/solana/trustRegistry/governance/institutionalCustodyEnv";
import { observeSquadsV4Multisig } from "@/lib/solana/trustRegistry/governance/observeSquadsV4Multisig";
import { runSquadsV4CustodyPreflight } from "@/lib/solana/trustRegistry/governance/squadsV4CustodyPreflight";
import { fetchSolanaGenesisHash } from "@/lib/solana/trustRegistry/governance/solanaGovernanceJsonRpc";

export async function fetchInstitutionalSquadsCustody(params: {
  rpcUrl: string;
  env?: InstitutionalCustodyEnvConfig;
}): Promise<{
  env: InstitutionalCustodyEnvConfig;
  genesisHash: string;
  protocolUpgradeMultisig: Awaited<ReturnType<typeof observeSquadsV4Multisig>> | null;
  registryAdminMultisig: Awaited<ReturnType<typeof observeSquadsV4Multisig>> | null;
  preflight: ReturnType<typeof runSquadsV4CustodyPreflight>;
  rpcFailures: string[];
}> {
  const env = params.env ?? parseInstitutionalCustodyFromEnv();
  const rpcFailures: string[] = [];
  const genesisResult = await fetchSolanaGenesisHash(params.rpcUrl);
  const genesisHash = genesisResult.ok ? genesisResult.value : "";
  if (!genesisResult.ok) {
    rpcFailures.push(`${genesisResult.code}:${genesisResult.detail}`);
  }

  const upgradeVaultExpected = env.verifiedProtocolUpgradeVaultPda;
  const registryVaultExpected = env.verifiedRegistryAdminVaultPda;

  let protocolUpgradeMultisig = null;
  let registryAdminMultisig = null;

  if (env.protocolUpgradeMultisigPda) {
    protocolUpgradeMultisig = await observeSquadsV4Multisig({
      rpcUrl: params.rpcUrl,
      multisigPda: env.protocolUpgradeMultisigPda,
      vaultIndex: env.protocolUpgradeVaultIndex,
      expectedVaultPda: upgradeVaultExpected,
    });
    rpcFailures.push(...protocolUpgradeMultisig.errors.filter((e) => e.includes("rpc")));
  }

  if (env.registryAdminMultisigPda) {
    registryAdminMultisig = await observeSquadsV4Multisig({
      rpcUrl: params.rpcUrl,
      multisigPda: env.registryAdminMultisigPda,
      vaultIndex: env.registryAdminVaultIndex,
      expectedVaultPda: registryVaultExpected,
    });
    rpcFailures.push(...registryAdminMultisig.errors.filter((e) => e.includes("rpc")));
  }

  const preflight = runSquadsV4CustodyPreflight({
    clusterGenesisHash: genesisHash,
    protocolUpgrade: protocolUpgradeMultisig,
    registryAdministration: registryAdminMultisig,
    env,
  });

  return {
    env,
    genesisHash,
    protocolUpgradeMultisig,
    registryAdminMultisig,
    preflight,
    rpcFailures,
  };
}
