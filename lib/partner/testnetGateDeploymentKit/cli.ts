import { readFileSync } from "node:fs";
import { planInstitutionalTestnetGate, planTestnetGate } from "./plan";
import { deployTestnetGate } from "./deploy";
import { verifyTestnetManifest } from "./verify";
import { registerTestnetManifest } from "./register";
import { rejectForbiddenNetwork } from "./networks";
import { TESTNET_GATE_CLI, TESTNET_GATE_ENV_NAMES } from "./contract";
import type { KitCliResult } from "./types";

function readManifest(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function planBindings(env: NodeJS.ProcessEnv) {
  return {
    partner_id: env.ABRAXAS_GATE_PARTNER_ID?.trim() || undefined,
    application_id: env.ABRAXAS_GATE_APPLICATION_ID?.trim() || undefined,
    policy_id: env.ABRAXAS_GATE_POLICY_ID?.trim() || undefined,
    policy_version: env.ABRAXAS_GATE_POLICY_VERSION ? Number(env.ABRAXAS_GATE_POLICY_VERSION) : undefined,
    signer_key_id: env.ABRAXAS_GATE_SIGNER_KEY_ID?.trim() || undefined,
  };
}

export async function runAbraxasGate(argv: string[], env: NodeJS.ProcessEnv = process.env): Promise<KitCliResult> {
  const args = argv.filter((item) => item !== "--");
  const command = args[0] ?? "";
  const target = args[1] ?? "";
  const confirm = args.includes("--confirm");
  if (command === "plan" && (target === "solana" || target === "evm")) {
    const forbidden = rejectForbiddenNetwork(target === "evm" ? "evm_sepolia" : "solana_devnet");
    if (forbidden) return { ok: false, command: `plan ${target}`, reason: forbidden };
    const planned = planTestnetGate({ target, bindings: planBindings(env) });
    if (!planned.ok) return { ok: false, command: `plan ${target}`, reason: planned.reason };
    return { ok: true, command: `plan ${target}`, envelope: planned.envelope };
  }
  if (command === "plan" && (target === "institutional-evm-sepolia" || target === "institutional-solana-devnet")) {
    const forbidden = rejectForbiddenNetwork(target.includes("evm") ? "evm_sepolia" : "solana_devnet");
    if (forbidden) return { ok: false, command: `plan ${target}`, reason: forbidden };
    const planned = planInstitutionalTestnetGate({
      target,
      bindings: planBindings(env),
      organizationRef: env[TESTNET_GATE_ENV_NAMES.organization_ref],
      actorRef: env[TESTNET_GATE_ENV_NAMES.actor_ref],
      resultCategory: env[TESTNET_GATE_ENV_NAMES.result_category],
      publicVerifier: env[TESTNET_GATE_ENV_NAMES.public_verifier],
      validUntil: env[TESTNET_GATE_ENV_NAMES.valid_until] ? Number(env[TESTNET_GATE_ENV_NAMES.valid_until]) : undefined,
    });
    if (!planned.ok) return { ok: false, command: `plan ${target}`, reason: planned.reason };
    return { ok: true, command: `plan ${target}`, envelope: planned.envelope };
  }
  if (
    command === "deploy"
    && (
      target === "solana-devnet"
      || target === "evm-testnet"
      || target === "institutional-evm-sepolia"
      || target === "institutional-solana-devnet"
    )
  ) {
    return deployTestnetGate({ target, confirm, env, bindings: planBindings(env) });
  }
  if (command === "verify" && target) {
    const verified = await verifyTestnetManifest(readManifest(target));
    if (!verified.ok) return { ok: false, command: "verify", reason: verified.reason };
    return { ok: true, command: "verify" };
  }
  if (command === "register" && target) {
    return registerTestnetManifest({ raw: readManifest(target), env });
  }
  return { ok: false, command: TESTNET_GATE_CLI, reason: "unknown_command" };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const result = await runAbraxasGate(argv);
  const phase = result.ok ? result.envelope?.phase : undefined;
  const reason = result.ok ? undefined : result.reason;
  process.stdout.write(`${JSON.stringify({ ok: result.ok, command: result.command, reason, phase, live: false })}\n`);
  return result.ok ? 0 : 1;
}
