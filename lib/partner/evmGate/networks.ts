// Deployment targets for the partner-owned EVM gate. Never infers live.

import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";

export const EVM_GATE_LOCAL_CHAIN_ID = 31337 as const;

export interface EvmGateNetworkPosture {
  network_id: string;
  chain_id: number | null;
  deployable: boolean;
  future_compatible: boolean;
  registry_status: string | null;
  live: false;
  circle_settlement: false;
  note: string;
}

function posture(
  networkId: string,
  chainId: number | null,
  extra: Pick<EvmGateNetworkPosture, "deployable" | "future_compatible" | "note">,
): EvmGateNetworkPosture {
  const entry = getNetworkCapability(networkId);
  return {
    network_id: networkId,
    chain_id: chainId,
    deployable: extra.deployable && entry?.status === "configured",
    future_compatible: extra.future_compatible,
    registry_status: entry?.status ?? null,
    live: false,
    circle_settlement: false,
    note: extra.note,
  };
}

export const EVM_GATE_NETWORK_POSTURES: readonly EvmGateNetworkPosture[] = [
  posture("evm_sandbox", EVM_GATE_LOCAL_CHAIN_ID, {
    deployable: true,
    future_compatible: false,
    note: "Local Anvil/Foundry chain for partner-owned gate tests. Not a hosted chain.",
  }),
  posture("evm_sepolia", 11155111, {
    deployable: true,
    future_compatible: false,
    note: "Approved EVM testnet (Sepolia, published chain ID 11155111). Human-operated partner deploy only. Not Mainnet, Arc, or Circle settlement.",
  }),
  posture("evm_mainnet", 1, {
    deployable: false,
    future_compatible: true,
    note: "Ethereum-class Mainnet stays on Production review. Not activated.",
  }),
  posture("arc_circle_testnet", null, {
    deployable: false,
    future_compatible: true,
    note: "Arc/Circle-compatible EVM is a future partner deployment target. Registry is configured; this kit does not publish an Arc chain ID or USDC path. Circle settlement stays separate.",
  }),
  posture("arc_circle_mainnet", null, {
    deployable: false,
    future_compatible: false,
    note: "Arc/Circle Mainnet remains disabled.",
  }),
];

export function getEvmGateNetworkPosture(networkId: string): EvmGateNetworkPosture | null {
  return EVM_GATE_NETWORK_POSTURES.find((row) => row.network_id === networkId) ?? null;
}

export function networkAllowsEvmGateManifest(networkId: string, chainId: number): boolean {
  const postureRow = getEvmGateNetworkPosture(networkId);
  const entry = getNetworkCapability(networkId);
  if (!postureRow || !entry) return false;
  if (entry.status === "disabled") return false;
  if (!postureRow.deployable) return false;
  if (postureRow.chain_id == null || postureRow.chain_id !== chainId) return false;
  return true;
}
