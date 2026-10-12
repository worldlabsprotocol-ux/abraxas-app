import { Connection } from "@solana/web3.js";
import {
  parseInstitutionalCustodyFromEnv,
  type InstitutionalCustodyEnvConfig,
} from "@/lib/solana/trustRegistry/governance/institutionalCustodyEnv";
import { observeSquadsV4Multisig } from "@/lib/solana/trustRegistry/governance/observeSquadsV4Multisig";
import { runSquadsV4CustodyPreflight } from "@/lib/solana/trustRegistry/governance/squadsV4CustodyPreflight";

export async function fetchInstitutionalSquadsCustody(params: {
  rpcUrl: string;
  env?: InstitutionalCustodyEnvConfig;
}): Promise<{
  env: InstitutionalCustodyEnvConfig;
  genesisHash: string;
  protocolUpgradeMultisig: Awaited<ReturnType<typeof observeSquadsV4Multisig>> | null;
  registryAdminMultisig: Awaited<ReturnType<typeof observeSquadsV4Multisig>> | null;
  preflight: ReturnType<typeof runSquadsV4CustodyPreflight>;
}> {
  const env = params.env ?? parseInstitutionalCustodyFromEnv();
  const connection = new Connection(params.rpcUrl, "confirmed");
  const genesisHash = (await connection.getGenesisHash()) ?? "";

  const upgradeVaultExpected = env.verifiedProtocolUpgradeVaultPda;
  const registryVaultExpected = env.verifiedRegistryAdminVaultPda;

  let protocolUpgradeMultisig = null;
  let registryAdminMultisig = null;

  if (env.protocolUpgradeMultisigPda) {
    protocolUpgradeMultisig = await observeSquadsV4Multisig({
      connection,
      multisigPda: env.protocolUpgradeMultisigPda,
      vaultIndex: env.protocolUpgradeVaultIndex,
      expectedVaultPda: upgradeVaultExpected,
    });
  }

  if (env.registryAdminMultisigPda) {
    registryAdminMultisig = await observeSquadsV4Multisig({
      connection,
      multisigPda: env.registryAdminMultisigPda,
      vaultIndex: env.registryAdminVaultIndex,
      expectedVaultPda: registryVaultExpected,
    });
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
  };
}
