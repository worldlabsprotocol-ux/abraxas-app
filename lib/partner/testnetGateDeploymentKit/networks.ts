import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import { getEvmGateNetworkPosture } from "@/lib/partner/evmGate/networks";
import {
  APPROVED_EVM_TESTNET_CHAIN_ID,
  APPROVED_EVM_TESTNET_ID,
  APPROVED_SOLANA_TESTNET_ID,
  TESTNET_GATE_FORBIDDEN_NETWORKS,
} from "./contract";

export function publishedArcTestnetChainId(): number | null {
  const posture = getEvmGateNetworkPosture("arc_circle_testnet");
  return posture?.chain_id ?? null;
}

export type HumanTestnetTarget =
  | "solana"
  | "evm"
  | "solana-devnet"
  | "evm-testnet"
  | "institutional-evm-sepolia"
  | "institutional-solana-devnet";

export function approvedHumanTestnet(target: HumanTestnetTarget): {
  ok: true;
  network_id: string;
  chain_id: number | null;
  gate_type: "evm" | "solana";
} | { ok: false; reason: string } {
  if (target === "solana" || target === "solana-devnet" || target === "institutional-solana-devnet") {
    const entry = getNetworkCapability(APPROVED_SOLANA_TESTNET_ID);
    if (!entry || entry.status === "disabled" || entry.environment === "mainnet") {
      return { ok: false, reason: "network_disabled" };
    }
    return { ok: true, network_id: APPROVED_SOLANA_TESTNET_ID, chain_id: null, gate_type: "solana" };
  }
  const entry = getNetworkCapability(APPROVED_EVM_TESTNET_ID);
  const posture = getEvmGateNetworkPosture(APPROVED_EVM_TESTNET_ID);
  if (!entry || entry.status !== "configured" || !posture?.chain_id) {
    return { ok: false, reason: "network_disabled" };
  }
  if (posture.chain_id !== APPROVED_EVM_TESTNET_CHAIN_ID) return { ok: false, reason: "network_disabled" };
  return { ok: true, network_id: APPROVED_EVM_TESTNET_ID, chain_id: posture.chain_id, gate_type: "evm" };
}

export function rejectForbiddenNetwork(networkId: string): string | null {
  if ((TESTNET_GATE_FORBIDDEN_NETWORKS as readonly string[]).includes(networkId)) return "mainnet_forbidden";
  if (networkId === "arc_circle_testnet" && publishedArcTestnetChainId() == null) {
    return "arc_chain_id_unpublished";
  }
  const entry = getNetworkCapability(networkId);
  if (!entry) return "unknown_network";
  if (entry.status === "disabled") return "network_disabled";
  if (entry.environment === "mainnet" || entry.status === "production_review_required") return "mainnet_forbidden";
  return null;
}
