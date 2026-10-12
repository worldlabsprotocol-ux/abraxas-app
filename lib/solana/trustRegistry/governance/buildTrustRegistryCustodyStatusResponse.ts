// FILE: lib/solana/trustRegistry/governance/buildTrustRegistryCustodyStatusResponse.ts

import { NextResponse } from "next/server";
import type { DevnetTrustRegistryObservation } from "@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation";
import type { GovernanceActivationGateResult } from "@/lib/solana/trustRegistry/governance/governanceActivationGate";

export type TrustRegistryCustodyStatusBody = {
  schema: "trust_registry_custody_status_v539";
  operational_status: "ok" | "degraded" | "rpc_unavailable" | "internal_error";
  error?: string;
  detail?: string;
  rpc_evidence?: {
    rpc_url: string;
    reachable: boolean;
    failures: string[];
  };
  gate?: GovernanceActivationGateResult;
  custody?: {
    envConfigured: boolean;
    protocolUpgradeMultisig: unknown;
    registryAdministrationMultisig: unknown;
    preflight: unknown;
  };
  authority_separation?: {
    registry_governance_authority: string | null;
    program_upgrade_authority: string | null;
    squads_multisig_env_configured: boolean;
    live_multisig_observation: boolean;
  };
  runbook?: ReturnType<
    typeof import("@/lib/solana/trustRegistry/governance/squadsV4ProvisioningRunbook").squadsV4InstitutionalProvisioningRunbook
  >;
  liveControlsEnabled: false;
};

function authoritySeparation(
  observation: DevnetTrustRegistryObservation | null,
  envConfigured: boolean,
  liveMultisigObserved: boolean,
): TrustRegistryCustodyStatusBody["authority_separation"] {
  return {
    registry_governance_authority: observation?.governance_authority ?? null,
    program_upgrade_authority: observation?.upgrade_authority ?? null,
    squads_multisig_env_configured: envConfigured,
    live_multisig_observation: liveMultisigObserved,
  };
}

export async function buildTrustRegistryCustodyStatusResponse(
  env: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse<TrustRegistryCustodyStatusBody>> {
  const rpc = env.SOLANA_DEVNET_RPC_URL?.trim() || "https://api.devnet.solana.com";
  const base: TrustRegistryCustodyStatusBody = {
    schema: "trust_registry_custody_status_v539",
    operational_status: "internal_error",
    liveControlsEnabled: false,
  };

  try {
    const [
      { runGovernanceActivationGate },
      { observeDevnetTrustRegistryActivation },
      { fetchInstitutionalSquadsCustody },
      { squadsV4InstitutionalProvisioningRunbook },
    ] = await Promise.all([
      import("@/lib/solana/trustRegistry/governance/governanceActivationGate"),
      import("@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation"),
      import("@/lib/solana/trustRegistry/governance/fetchInstitutionalSquadsCustody"),
      import("@/lib/solana/trustRegistry/governance/squadsV4ProvisioningRunbook"),
    ]);

    const [observation, custody] = await Promise.all([
      observeDevnetTrustRegistryActivation(rpc),
      fetchInstitutionalSquadsCustody({ rpcUrl: rpc }),
    ]);

    const rpcFailures = [
      ...observation.errors,
      ...(custody.rpcFailures ?? []),
    ];
    const rpcReachable =
      observation.genesis_hash != null
      || observation.program_executable
      || observation.registry_pda_present;

    const envConfigured = Boolean(
      custody.env.protocolUpgradeMultisigPda || custody.env.registryAdminMultisigPda,
    );
    const liveMultisigObserved = Boolean(
      custody.protocolUpgradeMultisig?.accountPresent
      || custody.registryAdminMultisig?.accountPresent,
    );

    const gate = runGovernanceActivationGate({
      devnetObservation: observation,
      squadsCustodyPreflight: custody.preflight,
      squadsMemberPubkeys: custody.env.squadsMemberPubkeysDocumented,
      squadsThreshold: custody.env.squadsThresholdDocumented,
      protocolUpgradeVaultPda: custody.protocolUpgradeMultisig?.derivedVaultPda ?? null,
      registryAdministrationVaultPda: custody.registryAdminMultisig?.derivedVaultPda ?? null,
    });

    const body: TrustRegistryCustodyStatusBody = {
      ...base,
      operational_status:
        rpcFailures.some((f) => f.includes("rpc_") || f.includes("rpc_meta_failed"))
          ? "degraded"
          : "ok",
      rpc_evidence: {
        rpc_url: rpc,
        reachable: rpcReachable,
        failures: rpcFailures,
      },
      gate,
      custody: {
        envConfigured,
        protocolUpgradeMultisig: custody.protocolUpgradeMultisig,
        registryAdministrationMultisig: custody.registryAdminMultisig,
        preflight: custody.preflight,
      },
      authority_separation: authoritySeparation(observation, envConfigured, liveMultisigObserved),
      runbook: squadsV4InstitutionalProvisioningRunbook(),
    };

    if (!rpcReachable && rpcFailures.length > 0) {
      body.operational_status = "rpc_unavailable";
      return NextResponse.json(body, { status: 503 });
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        ...base,
        operational_status: "internal_error",
        error: "custody_status_internal_failure",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
