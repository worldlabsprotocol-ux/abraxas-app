import { NextResponse } from "next/server";
import { runGovernanceActivationGate } from "@/lib/solana/trustRegistry/governance/governanceActivationGate";
import { observeDevnetTrustRegistryActivation } from "@/lib/solana/trustRegistry/governance/observeDevnetTrustRegistryActivation";
import { fetchInstitutionalSquadsCustody } from "@/lib/solana/trustRegistry/governance/fetchInstitutionalSquadsCustody";
import { squadsV4InstitutionalProvisioningRunbook } from "@/lib/solana/trustRegistry/governance/squadsV4ProvisioningRunbook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const rpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  try {
    const [observation, custody] = await Promise.all([
      observeDevnetTrustRegistryActivation(rpc),
      fetchInstitutionalSquadsCustody({ rpcUrl: rpc }),
    ]);

    const gate = runGovernanceActivationGate({
      devnetObservation: observation,
      squadsCustodyPreflight: custody.preflight,
      squadsMemberPubkeys: custody.env.squadsMemberPubkeysDocumented,
      squadsThreshold: custody.env.squadsThresholdDocumented,
      protocolUpgradeVaultPda: custody.protocolUpgradeMultisig?.derivedVaultPda ?? null,
      registryAdministrationVaultPda: custody.registryAdminMultisig?.derivedVaultPda ?? null,
    });

    return NextResponse.json({
      schema: "trust_registry_custody_status_v539",
      gate,
      custody: {
        envConfigured: Boolean(
          custody.env.protocolUpgradeMultisigPda || custody.env.registryAdminMultisigPda,
        ),
        protocolUpgradeMultisig: custody.protocolUpgradeMultisig,
        registryAdministrationMultisig: custody.registryAdminMultisig,
        preflight: custody.preflight,
      },
      runbook: squadsV4InstitutionalProvisioningRunbook(),
      liveControlsEnabled: false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        schema: "trust_registry_custody_status_v539",
        error: "custody_status_fetch_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
