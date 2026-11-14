import { describe, expect, it } from "vitest";
import {
  buildPersistentNpInstitutionalInventory,
  summarizePersistentNpActivationTier,
} from "./persistentNpInstitutionalInventory";
import { GOVERNANCE_OPERATOR_PG_URL_ENV_NAME } from "../institutional/signing/custodyImplementation";

function npWorkerEnv(): Record<string, string> {
  return {
    ABRAXAS_INSTITUTIONAL_SIGNING_WORKER: "1",
    ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT: "demo",
    ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER: "self-hosted-file",
    ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH: "/secure/issuer.seed",
    ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH: "/secure/status.seed",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: "np-anchor",
    ABRAXAS_STATUS_SIGNER_KEY_ID: "np-status",
    ABRAXAS_WORKER_CALLER_STATUS_SCOPE: "institution_wide",
    ABRAXAS_WORKER_CALLER_STATUS_SECRET: "status-secret-min-16-chars",
    ABRAXAS_WORKER_CALLER_ISSUER_SECRET: "issuer-secret-min-16-chars",
    ABRAXAS_WORKER_CALLER_AUTHORITY_SECRET: "authority-secret-min-16",
    ABRAXAS_WORKER_CALLER_HEALTH_SECRET: "health-secret-min-16-chars",
    ABRAXAS_DATABASE_URL: "postgresql://runtime:runtime@127.0.0.1:5432/abraxas_sovereign_staging",
    [GOVERNANCE_OPERATOR_PG_URL_ENV_NAME]: "postgresql://gov:gov@127.0.0.1:5432/abraxas_governance_operator",
    ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
    ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
  };
}

describe("persistentNpInstitutionalInventory", () => {
  it("never emits secrets in inventory JSON", () => {
    const env = npWorkerEnv();
    const inv = buildPersistentNpInstitutionalInventory(env);
    const serialized = JSON.stringify(inv);
    expect(serialized).not.toContain("status-secret");
    expect(serialized).not.toContain("runtime:runtime");
    expect(inv.aws_kms_env_present).toEqual([]);
    expect(inv.worker_startup.ok).toBe(true);
  });

  it("blocks when governance URL is on worker EnvironmentFile", () => {
    const env = {
      ...npWorkerEnv(),
      ABRAXAS_BUILD_962_WORKER_ENV_FILE: "1",
    };
    const inv = buildPersistentNpInstitutionalInventory(env);
    expect(inv.governance_operator_pg_url_on_worker).toBe(true);
    const tier = summarizePersistentNpActivationTier(inv, env);
    expect(tier.tier).toBe("BLOCKED");
    expect(tier.hard_blockers).toContain("governance_pg_url_must_not_be_on_worker");
  });

  it("reports live verification pending when config validates but host not attested", () => {
    const tier = summarizePersistentNpActivationTier(buildPersistentNpInstitutionalInventory(npWorkerEnv()));
    expect(tier.tier).toBe("LIVE_VERIFICATION_PENDING");
    expect(tier.soft_blockers).toContain("external_staging_not_attested");
  });
});