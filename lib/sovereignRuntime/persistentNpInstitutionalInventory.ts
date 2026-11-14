// BUILD #962 — redacted persistent NP inventory (never emits secret values or seed contents).

import { LIVE_AWS_KMS_REQUIRED_ENV_VARS } from "../institutional/signing/awsKmsLiveTestEnv";
import { GOVERNANCE_OPERATOR_PG_URL_ENV_NAME } from "../institutional/signing/custodyImplementation";
import { validateInstitutionalWorkerStartup } from "../institutional/signing/worker/workerStartup";
import { buildStagingInfraInventory } from "./stagingInfraInventory";
import { parsePostgresEndpoint } from "./pgConnectionIdentity";

export type PersistentNpInstitutionalInventory = {
  build: 962;
  staging: ReturnType<typeof buildStagingInfraInventory>;
  institutional_worker_flag: boolean;
  custody_provider: string | null;
  worker_environment: string | null;
  listen_host: string | null;
  self_hosted_issuer_seed_path_set: boolean;
  self_hosted_status_seed_path_set: boolean;
  governance_operator_pg_url_on_worker: boolean;
  aws_kms_env_present: string[];
  vercel_worker_env_present: boolean;
  worker_startup: ReturnType<typeof validateInstitutionalWorkerStartup> | { ok: false; reason: "worker_env_incomplete" };
  runtime_postgres: { host: string; port: number; database: string } | null;
  governance_postgres: { host: string; port: number; database: string } | null;
  governance_runtime_endpoints_distinct: boolean | null;
  external_staging_attested: boolean;
  mtls_ingress_documented: boolean;
  hardware_non_exportable_claim_forbidden: true;
};

export function buildPersistentNpInstitutionalInventory(
  env: Record<string, string | undefined> = process.env,
): PersistentNpInstitutionalInventory {
  const listenHost = env.ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST?.trim() || "127.0.0.1";
  const awsPresent = LIVE_AWS_KMS_REQUIRED_ENV_VARS.filter((name) => Boolean(env[name]?.trim()));

  const workerProbeEnv: Record<string, string | undefined> = {
    ...env,
    ABRAXAS_INSTITUTIONAL_SIGNING_WORKER: env.ABRAXAS_INSTITUTIONAL_SIGNING_WORKER ?? "1",
  };
  delete workerProbeEnv[GOVERNANCE_OPERATOR_PG_URL_ENV_NAME];

  let workerStartup: PersistentNpInstitutionalInventory["worker_startup"];
  if (workerProbeEnv.ABRAXAS_INSTITUTIONAL_SIGNING_WORKER?.trim() !== "1") {
    workerStartup = { ok: false, reason: "worker_env_incomplete" };
  } else {
    workerStartup = validateInstitutionalWorkerStartup({ env: workerProbeEnv, listenHost });
  }

  const runtimeUrl =
    env.ABRAXAS_DATABASE_URL?.trim()
    ?? env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
    ?? env.ABRAXAS_DISPOSABLE_PG_TEST_URL?.trim();
  const governanceUrl = env[GOVERNANCE_OPERATOR_PG_URL_ENV_NAME]?.trim();

  const runtimeEndpoint = parsePostgresEndpoint(runtimeUrl);
  const governanceEndpoint = parsePostgresEndpoint(governanceUrl);

  let endpointsDistinct: boolean | null = null;
  if (runtimeEndpoint.ok && governanceEndpoint.ok) {
    const r = runtimeEndpoint.endpoint;
    const g = governanceEndpoint.endpoint;
    endpointsDistinct = r.host !== g.host || r.port !== g.port || r.database !== g.database;
  }

  return {
    build: 962,
    staging: buildStagingInfraInventory(env),
    institutional_worker_flag: env.ABRAXAS_INSTITUTIONAL_SIGNING_WORKER?.trim() === "1",
    custody_provider: env.ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER?.trim()
      ?? (env.ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH?.trim() ? "self-hosted-file" : null),
    worker_environment: env.ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT?.trim() ?? null,
    listen_host: listenHost,
    self_hosted_issuer_seed_path_set: Boolean(env.ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH?.trim()),
    self_hosted_status_seed_path_set: Boolean(env.ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH?.trim()),
    governance_operator_pg_url_on_worker: Boolean(
      env.ABRAXAS_INSTITUTIONAL_SIGNING_WORKER?.trim() === "1"
        && env[GOVERNANCE_OPERATOR_PG_URL_ENV_NAME]?.trim(),
    ),
    aws_kms_env_present: awsPresent,
    vercel_worker_env_present: Boolean(env.VERCEL?.trim() || env.VERCEL_ENV?.trim()),
    worker_startup: workerStartup,
    runtime_postgres: runtimeEndpoint.ok ? runtimeEndpoint.endpoint : null,
    governance_postgres: governanceEndpoint.ok ? governanceEndpoint.endpoint : null,
    governance_runtime_endpoints_distinct: endpointsDistinct,
    external_staging_attested: Boolean(env.ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED?.trim()),
    mtls_ingress_documented: Boolean(env.ABRAXAS_INSTITUTIONAL_WORKER_MTLS_CONFIGURED?.trim() === "1"),
    hardware_non_exportable_claim_forbidden: true,
  };
}

export function summarizePersistentNpActivationTier(
  inventory: PersistentNpInstitutionalInventory,
  env: Record<string, string | undefined> = process.env,
): {
  tier: "BLOCKED" | "READY_FOR_HOST_ACTIVATION" | "LIVE_VERIFICATION_PENDING" | "OPERATIONAL_ATTESTED";
  hard_blockers: string[];
  soft_blockers: string[];
} {
  const hard: string[] = [];
  const soft: string[] = [];

  if (inventory.vercel_worker_env_present) hard.push("vercel_cannot_host_institutional_worker");
  if (
    inventory.governance_operator_pg_url_on_worker
    && inventory.institutional_worker_flag
  ) {
    soft.push("governance_pg_url_must_not_be_in_worker_systemd_env");
  }
  if (inventory.aws_kms_env_present.length > 0) hard.push("aws_kms_env_present");
  if (!inventory.self_hosted_issuer_seed_path_set || !inventory.self_hosted_status_seed_path_set) {
    hard.push("self_hosted_seed_paths_missing");
  }
  if (!inventory.worker_startup.ok) {
    hard.push(`worker_startup:${"reason" in inventory.worker_startup ? inventory.worker_startup.reason : "unknown"}`);
  }
  if (!inventory.staging.primary_postgres) hard.push("runtime_postgres_url_missing_or_invalid");
  if (!inventory.governance_postgres) hard.push("governance_operator_pg_url_missing_or_invalid");
  if (inventory.governance_runtime_endpoints_distinct === false) {
    hard.push("governance_and_runtime_postgres_must_differ");
  }

  if (!inventory.external_staging_attested) soft.push("external_staging_not_attested");
  if (!inventory.mtls_ingress_documented) soft.push("mtls_ingress_not_documented_for_external_access");

  if (env.ABRAXAS_BUILD_962_WORKER_ENV_FILE === "1" && inventory.governance_operator_pg_url_on_worker) {
    hard.push("governance_pg_url_must_not_be_on_worker");
  }

  if (hard.length > 0) return { tier: "BLOCKED", hard_blockers: hard, soft_blockers: soft };
  if (inventory.external_staging_attested) {
    return { tier: "OPERATIONAL_ATTESTED", hard_blockers: [], soft_blockers: soft };
  }
  return { tier: "LIVE_VERIFICATION_PENDING", hard_blockers: [], soft_blockers: soft };
}