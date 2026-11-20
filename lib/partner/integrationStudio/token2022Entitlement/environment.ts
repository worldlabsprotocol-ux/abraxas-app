import { Connection, PublicKey } from "@solana/web3.js";
import {
  blockchainNativeRegistryAdmin,
  blockchainNativeStudioRpcUrl,
  isBlockchainNativeStudioConfigured,
} from "@/lib/partner/launchpad/blockchainNative/studioConfig";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";

export type Token2022StudioEnvironmentKind =
  | "production_unavailable"
  | "local_program_test_reference"
  | "connected_sandbox";

export type Token2022StudioEnvironment = {
  kind: Token2022StudioEnvironmentKind;
  label: string;
  mint_and_consume_actionable: boolean;
  proof_continuity_on_rpc: boolean;
  entitlement_consumer_on_rpc: boolean;
  rpc_url: string | null;
  registry_admin: string | null;
  detail: string;
};

function isProductionSurface(): boolean {
  const vercel = process.env.VERCEL_ENV?.trim();
  if (vercel === "production") return true;
  return process.env.NODE_ENV === "production" && vercel !== "preview" && vercel !== "development";
}

async function programDeployedOnRpc(programId: string, rpcUrl: string): Promise<boolean> {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const info = await connection.getAccountInfo(new PublicKey(programId), "confirmed");
    return Boolean(info?.executable);
  } catch {
    return false;
  }
}

export async function resolveToken2022StudioEnvironment(): Promise<Token2022StudioEnvironment> {
  if (isProductionSurface()) {
    return {
      kind: "production_unavailable",
      label: "Production — entitlement execution disabled",
      mint_and_consume_actionable: false,
      proof_continuity_on_rpc: false,
      entitlement_consumer_on_rpc: false,
      rpc_url: null,
      registry_admin: null,
      detail:
        "Receipt-backed Token-2022 studio execution is not enabled on production without founder deployment approval.",
    };
  }

  const rpc = blockchainNativeStudioRpcUrl();
  const admin = blockchainNativeRegistryAdmin();
  if (!isBlockchainNativeStudioConfigured() || !rpc || !admin) {
    return {
      kind: "local_program_test_reference",
      label: "Local ProgramTest reference (BUILD #981)",
      mint_and_consume_actionable: false,
      proof_continuity_on_rpc: false,
      entitlement_consumer_on_rpc: false,
      rpc_url: null,
      registry_admin: null,
      detail:
        "Studios without pinned proof-continuity RPC show executed ProgramTest evidence only. This is not a live cluster transaction.",
    };
  }

  const [proofOnRpc, consumerOnRpc] = await Promise.all([
    programDeployedOnRpc(PROOF_CONTINUITY_PROGRAM_ID, rpc),
    programDeployedOnRpc(ENTITLEMENT_CONSUMER_PROGRAM_ID, rpc),
  ]);

  if (proofOnRpc && consumerOnRpc) {
    return {
      kind: "connected_sandbox",
      label: "Connected sandbox RPC",
      mint_and_consume_actionable: false,
      proof_continuity_on_rpc: true,
      entitlement_consumer_on_rpc: true,
      rpc_url: rpc,
      registry_admin: admin,
      detail:
        "Programs are visible on the configured RPC. Studio mint/consume adapter wiring for holder wallets is not yet exposed here; use the local ProgramTest reference or partner-verify for full journeys.",
    };
  }

  return {
    kind: "local_program_test_reference",
    label: "Local reference — RPC missing entitlement programs",
    mint_and_consume_actionable: false,
    proof_continuity_on_rpc: proofOnRpc,
    entitlement_consumer_on_rpc: consumerOnRpc,
    rpc_url: rpc,
    registry_admin: admin,
    detail:
      "Pinned RPC does not have both proof-continuity and entitlement consumer programs. Mint and consume controls remain unavailable in the browser.",
  };
}