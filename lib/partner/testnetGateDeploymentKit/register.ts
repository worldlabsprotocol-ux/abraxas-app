import { registerOnchainGateDeployment } from "@/lib/partner/onchainGateDeployments/register";
import { verifyTestnetManifest } from "./verify";
import { TESTNET_GATE_ENV_NAMES } from "./contract";
import type { KitCliResult } from "./types";

export async function registerTestnetManifest(input: {
  raw: unknown;
  env?: NodeJS.ProcessEnv;
}): Promise<KitCliResult> {
  const command = "register";
  const env = input.env ?? process.env;
  const partnerId = env[TESTNET_GATE_ENV_NAMES.partner_id]?.trim() ?? "";
  const applicationId = env[TESTNET_GATE_ENV_NAMES.application_id]?.trim() ?? "";
  const policyId = env[TESTNET_GATE_ENV_NAMES.policy_id]?.trim() ?? "";
  const policyVersion = Number(env[TESTNET_GATE_ENV_NAMES.policy_version] ?? "1");
  if (!partnerId || !applicationId || !policyId || !Number.isInteger(policyVersion)) {
    return { ok: false, command, reason: "missing_operator_config" };
  }
  const verified = await verifyTestnetManifest(input.raw);
  if (!verified.ok) return { ok: false, command, reason: verified.reason };
  const registered = await registerOnchainGateDeployment({
    partnerId,
    applicationId,
    policyId,
    policyVersion,
    appEnvironment: "sandbox",
    manifest: verified.manifest,
    institutionalRequired: Boolean(
      input.raw && typeof input.raw === "object" && "institutional" in input.raw
        && (input.raw as { institutional?: { institutional_required?: boolean } }).institutional?.institutional_required,
    ),
  });
  if (!registered.ok) return { ok: false, command, reason: registered.reason };
  if (registered.record.status !== "verified_sandbox") {
    return { ok: false, command, reason: "deployment_not_verified" };
  }
  return { ok: true, command, public: registered.public };
}
