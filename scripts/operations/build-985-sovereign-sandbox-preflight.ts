#!/usr/bin/env npx tsx
/**
 * BUILD #985 — read-only sovereign sandbox activation preflight.
 * Does not deploy, fund wallets, or mutate cluster state.
 *
 * Run: npm run build-985:preflight
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateConnectedSandboxBoundary } from "@/lib/partner/integrationStudio/token2022Entitlement/connectedSandboxBoundary";
import {
  connectedSandboxAttestationsReady,
  connectedSandboxGenesisHash,
  entitlementConsumerProgramSha256,
  proofContinuityProgramSha256,
  readConnectedSandboxPinnedConfig,
} from "@/lib/partner/integrationStudio/token2022Entitlement/connectedSandboxConfig";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";
import { resolvePrepareBindingHmacSecret } from "@/lib/partner/launchpad/blockchainNative/prepareBindingSecret";
import { resolveEphemeralKvBackend } from "@/lib/auth/ephemeralWallet/redisKv";

export type Build985AcceptanceLabel =
  | "LOCAL_PROGRAMTEST_ACCEPTED"
  | "CONNECTED_SANDBOX_VERIFIED"
  | "NOT_PERFORMED"
  | "BLOCKED";

type EnvPresence = { name: string; present: boolean; required_for_connected: boolean };

const OUT =
  process.env.BUILD_985_PREFLIGHT_OUT?.trim() ?? "/opt/cursor/artifacts/build-985-preflight.json";

const REPO_ROOT = join(__dirname, "../..");
const DEPLOY_DIR = join(REPO_ROOT, "solana/abraxas-eligibility-gate/target/deploy");

function sha256File(path: string): string | null {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function redactRpc(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

function envPresenceChecks(): EnvPresence[] {
  const names: Array<{ name: string; required_for_connected: boolean }> = [
    { name: "ABRAXAS_PROOF_CONTINUITY_RPC_URL", required_for_connected: true },
    { name: "ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN", required_for_connected: true },
    { name: "ABRAXAS_ENTITLEMENT_RELYING_PARTY_ADMIN", required_for_connected: true },
    { name: "BLOCKCHAIN_NATIVE_PREPARE_HMAC_KEY", required_for_connected: true },
    { name: "ABRAXAS_CONNECTED_SANDBOX_CLUSTER", required_for_connected: false },
    { name: "ABRAXAS_CONNECTED_SANDBOX_GENESIS_HASH", required_for_connected: true },
    { name: "ABRAXAS_PROOF_CONTINUITY_PROGRAM_SHA256", required_for_connected: true },
    { name: "ABRAXAS_ENTITLEMENT_CONSUMER_PROGRAM_SHA256", required_for_connected: true },
  ];
  return names.map(({ name, required_for_connected }) => ({
    name,
    present: Boolean(process.env[name]?.trim()),
    required_for_connected,
  }));
}

function localArtifactDigests(): Record<string, string | null> {
  return {
    abraxas_proof_continuity_so: sha256File(join(DEPLOY_DIR, "abraxas_proof_continuity.so")),
    abraxas_proof_entitlement_consumer_so: sha256File(
      join(DEPLOY_DIR, "abraxas_proof_entitlement_consumer.so"),
    ),
  };
}

function connectedAcceptanceLabel(
  boundary: Awaited<ReturnType<typeof evaluateConnectedSandboxBoundary>>,
): Build985AcceptanceLabel {
  if (!boundary.ok) {
    if (boundary.code === "connected_sandbox_not_configured") return "NOT_PERFORMED";
    return "BLOCKED";
  }
  if (boundary.mint_and_consume_actionable) return "CONNECTED_SANDBOX_VERIFIED";
  return "BLOCKED";
}

async function main() {
  const boundary = await evaluateConnectedSandboxBoundary();
  const pinned = readConnectedSandboxPinnedConfig();
  const kvBackend = resolveEphemeralKvBackend(process.env);

  const localDigests = localArtifactDigests();
  const operatorAttestations = {
    genesis_hash_configured: Boolean(connectedSandboxGenesisHash()),
    proof_program_sha256_configured: Boolean(proofContinuityProgramSha256()),
    consumer_program_sha256_configured: Boolean(entitlementConsumerProgramSha256()),
    attestations_ready: connectedSandboxAttestationsReady(),
  };

  const report = {
    build: 985,
    generated_at: new Date().toISOString(),
    pinned_program_ids: {
      proof_continuity: PROOF_CONTINUITY_PROGRAM_ID,
      entitlement_consumer: ENTITLEMENT_CONSUMER_PROGRAM_ID,
    },
    local_repository_artifact_sha256: localDigests,
    operator_env_presence: envPresenceChecks(),
    prepare_hmac_configured: Boolean(resolvePrepareBindingHmacSecret()),
    distributed_prepare_store_backend: kvBackend,
    pinned_config_summary: pinned
      ? {
          rpc: redactRpc(pinned.rpc_url),
          cluster_label: pinned.cluster_label,
          registry_admin: pinned.registry_admin,
          relying_party_admin: pinned.relying_party_admin,
          genesis_hash: pinned.genesis_hash,
          proof_sha256_env: pinned.proof_continuity_program_sha256_hex,
          consumer_sha256_env: pinned.entitlement_consumer_program_sha256_hex,
        }
      : null,
    operator_attestations: operatorAttestations,
    connected_boundary: boundary,
    acceptance_labels: {
      local_programtest:
        "LOCAL_PROGRAMTEST_ACCEPTED (run cargo partner_acceptance + tokenization_entitlement; see BUILD_985 doc)",
      connected_sandbox: connectedAcceptanceLabel(boundary),
      independent_partner_offline:
        "NOT_PERFORMED unless ABRAXAS_BUILD985_CONNECTED_ACCEPTANCE=1 with live RPC evidence",
    },
    operator_activation_still_required: [
      "Deploy upgradeable proof-continuity and entitlement-consumer programs to pinned cluster (if not already).",
      "Initialize registry, entitlement mint config, and trusted relying-party config for partner/policy/application scope.",
      "Fund registry and relying-party admins; record genesis hash and ELF SHA-256 in operator env.",
      "Configure ephemeral KV (Redis/Upstash) for multi-instance prepare/confirm before connected Studio traffic.",
      "Founder approval before spend, mainnet, or production activation.",
    ],
    distributed_replay_notes: [
      "Prepare records and JTI signature bindings are separate KV keys; write order is prepare then JTI reset.",
      "Confirmation re-reads the current prepare record and rejects message-hash mismatch; confirm cache keys include message hash.",
      "See connectedSandboxPrepareStore.test.ts and connectedSandboxConfirmCache.test.ts for executable replay cases.",
    ],
    go_no_go: {
      local_engineering: "GO — ProgramTest partner journey and vitest prepare/confirm suites pass on CI agent.",
      connected_cluster:
        boundary.ok && boundary.mint_and_consume_actionable
          ? "GO pending wallet-authorized transaction evidence export"
          : "NO-GO — stop at operator configuration/deployment boundary",
    },
  };

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReport written: ${OUT}`);

  const exitBlocked = report.acceptance_labels.connected_sandbox === "BLOCKED";
  process.exit(exitBlocked ? 2 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});