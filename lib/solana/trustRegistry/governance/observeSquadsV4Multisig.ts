import { PublicKey, SystemProgram } from "@solana/web3.js";
import { deriveSquadsV4VaultPda, SQUADS_MULTISIG_V4_PROGRAM_ID } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";
import { fetchSolanaAccountInfo } from "@/lib/solana/trustRegistry/governance/solanaGovernanceJsonRpc";

export type SquadsV4MemberObservation = {
  pubkey: string;
  permissionsMask: number;
  hasInitiate: boolean;
  hasVote: boolean;
  hasExecute: boolean;
};

export type SquadsV4MultisigObservation = {
  schema: "squads_v4_multisig_observation_v539";
  multisigPda: string;
  vaultIndex: number;
  squadsProgramId: string;
  accountOwner: string | null;
  accountPresent: boolean;
  threshold: number | null;
  memberCount: number | null;
  members: SquadsV4MemberObservation[];
  derivedVaultPda: string;
  sdkVaultPda: string;
  vaultPdaDerivationMatchesSdk: boolean;
  expectedVaultPda: string | null;
  vaultPdaMatchesExpected: boolean | null;
  vaultLamports: number | null;
  vaultOwner: string | null;
  createKey: string | null;
  configAuthority: string | null;
  errors: string[];
};

export async function observeSquadsV4Multisig(params: {
  rpcUrl: string;
  multisigPda: string;
  vaultIndex: number;
  expectedVaultPda?: string | null;
}): Promise<SquadsV4MultisigObservation> {
  const errors: string[] = [];
  const squadsProgramId = SQUADS_MULTISIG_V4_PROGRAM_ID;
  let multisigPk: PublicKey;
  try {
    multisigPk = new PublicKey(params.multisigPda);
  } catch {
    return emptyObservation(params.multisigPda, params.vaultIndex, ["invalid_multisig_pda"]);
  }

  const derived = deriveSquadsV4VaultPda(multisigPk, params.vaultIndex);
  let sdkVault: PublicKey;
  let derivationMatches = false;
  try {
    const sqds = await import("@sqds/multisig");
    [sdkVault] = sqds.getVaultPda({ multisigPda: multisigPk, index: params.vaultIndex });
    derivationMatches = derived.vaultPda.equals(sdkVault);
  } catch {
    errors.push("sqds_sdk_unavailable");
    sdkVault = derived.vaultPda;
  }

  if (!derivationMatches && !errors.includes("sqds_sdk_unavailable")) {
    errors.push("local_vault_pda_differs_from_sqds_sdk");
  }

  let accountOwner: string | null = null;
  let accountPresent = false;
  let threshold: number | null = null;
  let memberCount: number | null = null;
  let members: SquadsV4MemberObservation[] = [];
  let createKey: string | null = null;
  let configAuthority: string | null = null;

  const multisigInfo = await fetchSolanaAccountInfo(params.rpcUrl, multisigPk.toBase58(), "confirmed");
  if (!multisigInfo.ok) {
    errors.push(`multisig_rpc_fetch_failed:${multisigInfo.code}`);
  } else if (!multisigInfo.value) {
    errors.push("multisig_account_missing");
  } else {
    accountPresent = true;
    accountOwner = multisigInfo.value.owner;
    if (accountOwner !== squadsProgramId) {
      errors.push("multisig_owner_not_squads_v4");
    }
    try {
      const sqds = await import("@sqds/multisig");
      const info = {
        owner: new PublicKey(multisigInfo.value.owner),
        lamports: multisigInfo.value.lamports,
        data: multisigInfo.value.data,
        executable: multisigInfo.value.executable,
      };
      const decoded = sqds.accounts.Multisig.fromAccountInfo(info as never)[0];
      threshold = decoded.threshold;
      memberCount = decoded.members.length;
      createKey = decoded.createKey.toBase58();
      configAuthority = decoded.configAuthority.toBase58();
      members = decoded.members.map((m) => ({
        pubkey: m.key.toBase58(),
        permissionsMask: m.permissions.mask,
        hasInitiate: sqds.types.Permissions.has(m.permissions, sqds.types.Permission.Initiate),
        hasVote: sqds.types.Permissions.has(m.permissions, sqds.types.Permission.Vote),
        hasExecute: sqds.types.Permissions.has(m.permissions, sqds.types.Permission.Execute),
      }));
    } catch {
      errors.push("multisig_deserialize_failed");
    }
  }

  let vaultLamports: number | null = null;
  let vaultOwner: string | null = null;
  const vaultInfo = await fetchSolanaAccountInfo(
    params.rpcUrl,
    derived.vaultPda.toBase58(),
    "confirmed",
  );
  if (!vaultInfo.ok) {
    errors.push(`vault_rpc_fetch_failed:${vaultInfo.code}`);
  } else if (!vaultInfo.value) {
    errors.push("vault_account_missing");
  } else {
    vaultLamports = vaultInfo.value.lamports;
    vaultOwner = vaultInfo.value.owner;
    if (vaultOwner !== SystemProgram.programId.toBase58()) {
      errors.push("vault_owner_not_system_program");
    }
  }

  const expected = params.expectedVaultPda?.trim() || null;
  let vaultPdaMatchesExpected: boolean | null = null;
  if (expected) {
    try {
      vaultPdaMatchesExpected = derived.vaultPda.equals(new PublicKey(expected));
      if (!vaultPdaMatchesExpected) errors.push("vault_pda_substitution_detected");
    } catch {
      errors.push("invalid_expected_vault_pda");
      vaultPdaMatchesExpected = false;
    }
  }

  return {
    schema: "squads_v4_multisig_observation_v539",
    multisigPda: multisigPk.toBase58(),
    vaultIndex: params.vaultIndex,
    squadsProgramId,
    accountOwner,
    accountPresent,
    threshold,
    memberCount,
    members,
    derivedVaultPda: derived.vaultPda.toBase58(),
    sdkVaultPda: sdkVault.toBase58(),
    vaultPdaDerivationMatchesSdk: derivationMatches,
    expectedVaultPda: expected,
    vaultPdaMatchesExpected,
    vaultLamports,
    vaultOwner,
    createKey,
    configAuthority,
    errors,
  };
}

function emptyObservation(
  multisigPda: string,
  vaultIndex: number,
  errors: string[],
): SquadsV4MultisigObservation {
  return {
    schema: "squads_v4_multisig_observation_v539",
    multisigPda,
    vaultIndex,
    squadsProgramId: SQUADS_MULTISIG_V4_PROGRAM_ID,
    accountOwner: null,
    accountPresent: false,
    threshold: null,
    memberCount: null,
    members: [],
    derivedVaultPda: "",
    sdkVaultPda: "",
    vaultPdaDerivationMatchesSdk: false,
    expectedVaultPda: null,
    vaultPdaMatchesExpected: null,
    vaultLamports: null,
    vaultOwner: null,
    createKey: null,
    configAuthority: null,
    errors,
  };
}
