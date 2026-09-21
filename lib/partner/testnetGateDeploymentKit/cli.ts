import { readFileSync, writeFileSync } from "node:fs";
import { planInstitutionalTestnetGate, planTestnetGate } from "./plan";
import { deployTestnetGate } from "./deploy";
import { verifyTestnetManifest } from "./verify";
import { registerTestnetManifest } from "./register";
import { rejectForbiddenNetwork } from "./networks";
import { validateInstitutionalPlanFile } from "./validatePlan";
import { operatorHandoffFromPlan } from "./handoff";
import { classifyKitFile } from "./classify";
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

function maybeWriteHandoff(result: KitCliResult, env: NodeJS.ProcessEnv): void {
  if (!result.handoff) return;
  const path = env.ABRAXAS_GATE_HANDOFF_PATH?.trim();
  if (!path) return;
  writeFileSync(path, `${JSON.stringify(result.handoff, null, 2)}\n`);
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
    return { ok: true, command: `plan ${target}`, envelope: planned.envelope, file_kind: "plan_envelope" };
  }
  if (command === "plan" && (target === "institutional-evm-sepolia" || target === "institutional-solana-devnet")) {
    const forbidden = rejectForbiddenNetwork(target.includes("evm") ? "evm_sepolia" : "solana_devnet");
    if (forbidden) return { ok: false, command: `plan ${target}`, reason: forbidden };
    const planned = planInstitutionalTestnetGate({
      target,
      bindings: planBindings(env),
      publicVerifier: env[TESTNET_GATE_ENV_NAMES.public_verifier],
    });
    if (!planned.ok) return { ok: false, command: `plan ${target}`, reason: planned.reason };
    return { ok: true, command: `plan ${target}`, envelope: planned.envelope, file_kind: "plan_envelope" };
  }
  if (command === "validate-plan" && target) {
    const validated = validateInstitutionalPlanFile(readManifest(target));
    if (!validated.ok || !validated.envelope) return validated;
    const result = { ...validated, handoff: operatorHandoffFromPlan(validated.envelope) };
    maybeWriteHandoff(result, env);
    return result;
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
    const result = deployTestnetGate({ target, confirm, env, bindings: planBindings(env) });
    maybeWriteHandoff(result, env);
    return result;
  }
  if (command === "verify" && target) {
    const kind = classifyKitFile(readManifest(target));
    if (kind === "plan_envelope") return { ok: false, command: "verify", reason: "plan_envelope", file_kind: kind };
    const verified = await verifyTestnetManifest(readManifest(target));
    if (!verified.ok) return { ok: false, command: "verify", reason: verified.reason, file_kind: kind };
    return { ok: true, command: "verify", file_kind: "registry_manifest" };
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
  process.stdout.write(`${JSON.stringify({
    ok: result.ok,
    command: result.command,
    reason,
    phase,
    file_kind: result.file_kind,
    broadcast: false,
    live: false,
  })}\n`);
  return result.ok ? 0 : 1;
}
