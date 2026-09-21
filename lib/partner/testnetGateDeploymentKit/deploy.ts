import { TESTNET_GATE_ENV_NAMES } from "./contract";
import { approvedHumanTestnet } from "./networks";
import { planTestnetGate } from "./plan";
import type { KitBindings, KitCliResult } from "./types";

export function automatedEnvironmentForbidden(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.VITEST === "1" || env.NODE_ENV === "test") return "automated_environment_forbidden";
  if (env.CI === "true" || env.CI === "1" || env.GITHUB_ACTIONS === "true") return "automated_environment_forbidden";
  if (env.VERCEL === "1" || env.VERCEL === "true") return "automated_environment_forbidden";
  if (env.NEXT_RUNTIME) return "automated_environment_forbidden";
  return null;
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string | null {
  const value = env[name]?.trim() ?? "";
  if (!value || value.startsWith("YOUR_")) return name;
  return null;
}

export function deployTestnetGate(input: {
  target: "solana-devnet" | "evm-testnet";
  confirm: boolean;
  bindings?: Partial<KitBindings>;
  env?: NodeJS.ProcessEnv;
}): KitCliResult {
  const command = `deploy ${input.target}`;
  if (!input.confirm) return { ok: false, command, reason: "confirmation_required" };
  const auto = automatedEnvironmentForbidden(input.env);
  if (auto) return { ok: false, command, reason: auto };
  const net = approvedHumanTestnet(input.target);
  if (!net.ok) return { ok: false, command, reason: net.reason };
  const env = input.env ?? process.env;
  const missing: string[] = [];
  if (net.gate_type === "evm") {
    const rpc = requireEnv(env, TESTNET_GATE_ENV_NAMES.evm_rpc);
    const key = requireEnv(env, TESTNET_GATE_ENV_NAMES.evm_key);
    if (rpc) missing.push(TESTNET_GATE_ENV_NAMES.evm_rpc);
    if (key) missing.push(TESTNET_GATE_ENV_NAMES.evm_key);
  } else {
    const rpc = requireEnv(env, TESTNET_GATE_ENV_NAMES.solana_rpc);
    const key = requireEnv(env, TESTNET_GATE_ENV_NAMES.solana_keypair);
    if (rpc) missing.push(TESTNET_GATE_ENV_NAMES.solana_rpc);
    if (key) missing.push(TESTNET_GATE_ENV_NAMES.solana_keypair);
  }
  if (missing.length) return { ok: false, command, reason: "missing_operator_config" };
  const planned = planTestnetGate({
    target: net.gate_type === "evm" ? "evm" : "solana",
    bindings: input.bindings,
  });
  if (!planned.ok) return { ok: false, command, reason: planned.reason };
  return { ok: false, command, reason: "human_broadcast_not_invoked" };
}
