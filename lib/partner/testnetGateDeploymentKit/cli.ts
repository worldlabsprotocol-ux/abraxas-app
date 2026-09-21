import { readFileSync } from "node:fs";
import { planTestnetGate } from "./plan";
import { deployTestnetGate } from "./deploy";
import { verifyTestnetManifest } from "./verify";
import { registerTestnetManifest } from "./register";
import { rejectForbiddenNetwork } from "./networks";
import { TESTNET_GATE_CLI } from "./contract";
import type { KitCliResult } from "./types";

function readManifest(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export async function runAbraxasGate(argv: string[], env: NodeJS.ProcessEnv = process.env): Promise<KitCliResult> {
  const args = argv.filter((item) => item !== "--");
  const command = args[0] ?? "";
  const target = args[1] ?? "";
  const confirm = args.includes("--confirm");
  if (command === "plan" && (target === "solana" || target === "evm")) {
    const forbidden = rejectForbiddenNetwork(target === "evm" ? "evm_sepolia" : "solana_devnet");
    if (forbidden) return { ok: false, command: `plan ${target}`, reason: forbidden };
    const planned = planTestnetGate({
      target,
      bindings: {
        partner_id: env.ABRAXAS_GATE_PARTNER_ID?.trim() || undefined,
        application_id: env.ABRAXAS_GATE_APPLICATION_ID?.trim() || undefined,
        policy_id: env.ABRAXAS_GATE_POLICY_ID?.trim() || undefined,
        policy_version: env.ABRAXAS_GATE_POLICY_VERSION ? Number(env.ABRAXAS_GATE_POLICY_VERSION) : undefined,
        signer_key_id: env.ABRAXAS_GATE_SIGNER_KEY_ID?.trim() || undefined,
      },
    });
    if (!planned.ok) return { ok: false, command: `plan ${target}`, reason: planned.reason };
    return { ok: true, command: `plan ${target}`, envelope: planned.envelope };
  }
  if (command === "deploy" && (target === "solana-devnet" || target === "evm-testnet")) {
    return deployTestnetGate({ target, confirm, env });
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
  process.stdout.write(`${JSON.stringify({ ok: result.ok, command: result.command, reason: "reason" in result ? result.reason : undefined, phase: result.envelope?.phase, live: false })}\n`);
  return result.ok ? 0 : 1;
}
