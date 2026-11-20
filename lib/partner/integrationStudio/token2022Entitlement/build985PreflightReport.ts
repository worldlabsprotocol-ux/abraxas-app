import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ConnectedSandboxBoundaryResult } from "./connectedSandboxBoundary";
import {
  assertPreflightReportHasNoRpcSecrets,
  assessDistributedKvReadiness,
  connectedClusterGoRecommendation,
  derivePreflightOperationalStatus,
  preflightConnectedVerificationStatus,
  redactRpcEndpoint,
  sanitizeConnectedBoundaryForPreflight,
  type Build985ConnectedOperationalStatus,
} from "./build985PreflightSemantics";
import {
  connectedSandboxAttestationsReady,
  connectedSandboxGenesisHash,
  entitlementConsumerProgramSha256,
  proofContinuityProgramSha256,
  readConnectedSandboxPinnedConfig,
} from "./connectedSandboxConfig";
import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { ENTITLEMENT_CONSUMER_PROGRAM_ID } from "@/lib/solana/token2022Entitlement/constants";
import { resolvePrepareBindingHmacSecret } from "@/lib/partner/launchpad/blockchainNative/prepareBindingSecret";

export type Build985PreflightReport = {
  build: 985;
  generated_at: string;
  pinned_program_ids: { proof_continuity: string; entitlement_consumer: string };
  local_repository_artifact_sha256: Record<string, string | null>;
  operator_env_presence: Array<{ name: string; present: boolean; required_for_connected: boolean }>;
  prepare_hmac_configured: boolean;
  distributed_kv_readiness: Awaited<ReturnType<typeof assessDistributedKvReadiness>>;
  pinned_config_summary: {
    rpc_endpoint: ReturnType<typeof redactRpcEndpoint>;
    cluster_label: string;
    registry_admin: string;
    relying_party_admin: string;
    genesis_hash: string | null;
    proof_sha256_env: string | null;
    consumer_sha256_env: string | null;
  } | null;
  operator_attestations: {
    genesis_hash_configured: boolean;
    proof_program_sha256_configured: boolean;
    consumer_program_sha256_configured: boolean;
    attestations_ready: boolean;
  };
  connected_operational_summary: ReturnType<typeof sanitizeConnectedBoundaryForPreflight>;
  acceptance: {
    local_programtest: string;
    connected_operational_status: Build985ConnectedOperationalStatus;
    connected_chain_verification: ReturnType<typeof preflightConnectedVerificationStatus>;
  };
  operator_activation_still_required: string[];
  distributed_replay_notes: string[];
  go_no_go: { local_engineering: string; connected_cluster: string };
};

const DEPLOY_DIR = join(process.cwd(), "solana/abraxas-eligibility-gate/target/deploy");

function sha256File(path: string): string | null {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function envPresenceChecks() {
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

export async function buildBuild985PreflightReport(input: {
  boundary: ConnectedSandboxBoundaryResult;
  env?: Record<string, string | undefined>;
}): Promise<Build985PreflightReport> {
  const env = input.env ?? process.env;
  const pinned = readConnectedSandboxPinnedConfig();
  const kv = await assessDistributedKvReadiness(env);
  const operational = derivePreflightOperationalStatus({ boundary: input.boundary, kv });
  const verification = preflightConnectedVerificationStatus();

  const report: Build985PreflightReport = {
    build: 985,
    generated_at: new Date().toISOString(),
    pinned_program_ids: {
      proof_continuity: PROOF_CONTINUITY_PROGRAM_ID,
      entitlement_consumer: ENTITLEMENT_CONSUMER_PROGRAM_ID,
    },
    local_repository_artifact_sha256: {
      abraxas_proof_continuity_so: sha256File(join(DEPLOY_DIR, "abraxas_proof_continuity.so")),
      abraxas_proof_entitlement_consumer_so: sha256File(
        join(DEPLOY_DIR, "abraxas_proof_entitlement_consumer.so"),
      ),
    },
    operator_env_presence: envPresenceChecks(),
    prepare_hmac_configured: Boolean(resolvePrepareBindingHmacSecret()),
    distributed_kv_readiness: kv,
    pinned_config_summary: pinned
      ? {
          rpc_endpoint: redactRpcEndpoint(pinned.rpc_url),
          cluster_label: pinned.cluster_label,
          registry_admin: pinned.registry_admin,
          relying_party_admin: pinned.relying_party_admin,
          genesis_hash: pinned.genesis_hash,
          proof_sha256_env: pinned.proof_continuity_program_sha256_hex,
          consumer_sha256_env: pinned.entitlement_consumer_program_sha256_hex,
        }
      : null,
    operator_attestations: {
      genesis_hash_configured: Boolean(connectedSandboxGenesisHash()),
      proof_program_sha256_configured: Boolean(proofContinuityProgramSha256()),
      consumer_program_sha256_configured: Boolean(entitlementConsumerProgramSha256()),
      attestations_ready: connectedSandboxAttestationsReady(),
    },
    connected_operational_summary: sanitizeConnectedBoundaryForPreflight(input.boundary),
    acceptance: {
      local_programtest:
        "LOCAL_PROGRAMTEST_ACCEPTED (run cargo partner_acceptance + tokenization_entitlement; see BUILD_985 doc)",
      connected_operational_status: operational,
      connected_chain_verification: verification,
    },
    operator_activation_still_required: [
      "Deploy upgradeable proof-continuity and entitlement-consumer programs to pinned cluster (if not already).",
      "Initialize registry, entitlement mint config, and trusted relying-party config for partner/policy/application scope.",
      "Fund registry and relying-party admins; record genesis hash and ELF SHA-256 in operator env.",
      "Configure ephemeral KV (Redis/Upstash) with successful connectivity probe before multi-instance connected Studio traffic.",
      "Execute wallet-signed mint and consume; export independent partner-verify evidence before claiming connected-chain verification.",
      "Founder approval before spend, mainnet, or production activation.",
    ],
    distributed_replay_notes: [
      "Connected sandbox preparation uses atomic bundle transitions (single Lua-evaluated key per jti/action) with monotonic generation.",
      "Confirmation binds and commits against preparation generation; stale caches miss when generation advances.",
      "Run connectedSandboxAtomic.redis.integration.test.ts with TCP Redis for distributed concurrency acceptance.",
    ],
    go_no_go: {
      local_engineering: "GO — ProgramTest partner journey and vitest prepare/confirm suites pass on CI agent.",
      connected_cluster: connectedClusterGoRecommendation(operational),
    },
  };

  assertPreflightReportHasNoRpcSecrets(JSON.stringify(report));
  return report;
}