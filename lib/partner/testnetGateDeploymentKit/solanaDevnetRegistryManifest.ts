import { parseOnchainDeploymentManifest } from "@/lib/partner/onchainGateDeployments/parseManifest";
import { solanaDigestFromManifest } from "@/lib/partner/onchainGateDeployments/digests";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import type { SolanaDeploymentManifest } from "@/lib/partner/onchainGateDeployments/types";
import { planSolanaDevnetGateConfig, type DevnetConfigPreflightInput } from "./solanaConfigPreflight";
import { inspectSolanaGateConfigAfterInitialize } from "./solanaGateConfigPostcheck";
import type { PublicSolanaAccountSource, PublicSolanaGenesisSource, ReviewedProgram } from "./solanaDevnetChainPrecheck";

/** Produce registry input only after the exact live-account, ELF and genesis postcheck. Does not register. */
export async function buildVerifiedSolanaDevnetRegistryManifest(input: DevnetConfigPreflightInput & {
  genesis: PublicSolanaGenesisSource;
  readAccount: PublicSolanaAccountSource;
  reviewed?: { gate: ReviewedProgram; consumer: ReviewedProgram };
}): Promise<
  | { ok: false; reason: string; registered: false; broadcast: false }
  | { ok: true; manifest: SolanaDeploymentManifest; observed: "exact_match";
      registered: false; broadcast: false }
> {
  const fail = (reason: string) => ({ ok: false as const, reason, registered: false as const, broadcast: false as const });
  const observed = await inspectSolanaGateConfigAfterInitialize(input);
  if (!observed.ok) return fail(observed.reason);
  const planned = planSolanaDevnetGateConfig(input);
  if (!planned.ok) return fail(planned.reason);
  const plan = planned.plan;
  if (observed.gate_config_pda !== plan.gate_config_pda || observed.config_digest !== plan.config_digest) {
    return fail("postcheck_plan_mismatch");
  }
  const candidate: SolanaDeploymentManifest = {
    schema_version: 1,
    gate_type: "solana",
    network_id: "solana_devnet",
    program_id: plan.gate_program_id,
    partner_program_id: plan.partner_program_id,
    gate_config_pda: observed.gate_config_pda,
    program_digest: SOLANA_GATE_V2_RELEASE.program_data_digest,
    config_digest: observed.config_digest,
    partner_hash: plan.partner_hash,
    policy_hash: plan.policy_hash,
    action_hash: plan.action_hash,
    action_type: plan.action_type,
    action_scope: plan.action_scope,
    environment: "sandbox",
    signer_key_id: plan.signer_key_id,
    subject_binding_mode: "required",
  };
  const parsed = parseOnchainDeploymentManifest(candidate);
  if (!parsed.ok || parsed.manifest.gate_type !== "solana") return fail("invalid_manifest");
  if (solanaDigestFromManifest(parsed.manifest, plan.environment_hash) !== observed.config_digest) {
    return fail("config_digest_mismatch");
  }
  return { ok: true, manifest: parsed.manifest, observed: "exact_match", registered: false, broadcast: false };
}
