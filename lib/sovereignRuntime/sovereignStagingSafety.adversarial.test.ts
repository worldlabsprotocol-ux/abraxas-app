import { describe, expect, it } from "vitest";
import {
  assertDistinctPostgresEndpoints,
  parsePostgresEndpoint,
  postgresEndpointsEqual,
} from "./pgConnectionIdentity";
import {
  assertStagingRestoreDrillAuthorized,
  assertRestoreTargetLiveIdentity,
} from "./sovereignRestoreSafety";
import {
  evaluateStagingHttpProbe,
  summarizeStagingHttpTier,
  STAGING_HTTP_SMOKE_PROBES,
} from "./stagingHttpProbeSpec";
import { validateStagingPersistentEnv } from "./sovereignActivationPolicy";
import { SOVEREIGN_STAGING_DATABASE_ID } from "./sovereignStagingConstants";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

const KEY_32 = Buffer.alloc(32, 7).toString("base64");
const VALID_JWK = JSON.stringify(generateTestSigningKeyPair().privateKeyJwk);

function stagingEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
    ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
    ABRAXAS_SOVEREIGN_DATABASE_ID: SOVEREIGN_STAGING_DATABASE_ID,
    ABRAXAS_DATABASE_URL: "postgresql://abraxas:secret@127.0.0.1:5432/abraxas_sovereign_staging",
    ABRAXAS_SOVEREIGN_RESTORE_PG_URL:
      "postgresql://abraxas:secret@127.0.0.1:5433/abraxas_sovereign_staging_restore",
    ABRAXAS_EVIDENCE_STORAGE_ROOT: "/var/abraxas/evidence",
    ABRAXAS_EVIDENCE_ENCRYPTION_KEY: KEY_32,
    ABRAXAS_BACKUP_ENCRYPTION_KEY: KEY_32,
    ABRAXAS_SIGNING_KEY: VALID_JWK,
    ABRAXAS_BACKUP_SCOPE: "sovereign",
    ABRAXAS_BACKUP_OUTPUT_DIR: "/var/abraxas/backups",
    ...overrides,
  };
}

describe("postgres endpoint canonicalization", () => {
  it("treats localhost and 127.0.0.1 as the same host for restore safety", () => {
    const a = parsePostgresEndpoint("postgresql://u1:p1@127.0.0.1:5432/abraxas_sovereign_staging");
    const b = parsePostgresEndpoint("postgresql://u2:p2@localhost:5432/abraxas_sovereign_staging?sslmode=require");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(postgresEndpointsEqual(a.endpoint, b.endpoint)).toBe(true);
    expect(
      assertDistinctPostgresEndpoints(
        "postgresql://u1:p1@127.0.0.1:5432/abraxas_sovereign_staging",
        "postgresql://u2:p2@localhost:5432/abraxas_sovereign_staging",
      )?.code,
    ).toBe("restore_target_must_differ");
  });

  it("allows different database on same host and port", () => {
    expect(
      assertDistinctPostgresEndpoints(
        "postgresql://a@127.0.0.1:5432/abraxas_sovereign_staging",
        "postgresql://b@127.0.0.1:5432/abraxas_sovereign_staging_restore",
      ),
    ).toBeNull();
  });
});

describe("staging restore drill authorization", () => {
  it("defaults to refusal without operator authorization", () => {
    expect(assertStagingRestoreDrillAuthorized({})).not.toHaveLength(0);
  });

  it("accepts explicit operator authorization pair", () => {
    expect(
      assertStagingRestoreDrillAuthorized({
        ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED: "true",
        ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION: "drill-ack",
        ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION_EXPECTED: "drill-ack",
      }),
    ).toHaveLength(0);
  });
});

describe("staging persistent env restore aliases", () => {
  it("blocks alias-equivalent restore URLs in validateStagingPersistentEnv", () => {
    const report = validateStagingPersistentEnv(
      stagingEnv({
        ABRAXAS_SOVEREIGN_RESTORE_PG_URL:
          "postgresql://other:pass@localhost:5432/abraxas_sovereign_staging",
      }),
    );
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === "restore_target_must_differ")).toBe(true);
  });
});

describe("live restore identity guard", () => {
  it("refuses when live databases match despite different credentials in URL", async () => {
    const client = {
      query: async () => ({ rows: [{ name: "abraxas_sovereign_staging" }] }),
    };
    const err = await assertRestoreTargetLiveIdentity({
      primaryUrl: "postgresql://a@127.0.0.1:5432/abraxas_sovereign_staging",
      restoreUrl: "postgresql://b@127.0.0.1:5433/abraxas_sovereign_staging",
      primaryClient: client,
      restoreClient: client,
    });
    expect(err?.code).toBe("restore_live_target_equals_primary");
  });
});

describe("staging HTTP probe invariants", () => {
  const healthSpec = STAGING_HTTP_SMOKE_PROBES.find((p) => p.id === "sovereign_health")!;

  it("does not certify 404 health responses", () => {
    const result = evaluateStagingHttpProbe({
      spec: healthSpec,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      bodyText: JSON.stringify({ build: 558, tier: "STAGING_READY" }),
    });
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.startsWith("expected_status_200"))).toBe(true);
  });

  it("does not certify redirect responses", () => {
    const result = evaluateStagingHttpProbe({
      spec: healthSpec,
      status: 302,
      headers: new Headers({ "content-type": "application/json", location: "/login" }),
      bodyText: "{}",
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain("unexpected_redirect_302");
  });

  it("keeps OBSERVED_STAGING_HTTP separate from full lifecycle certification", () => {
    const summary = summarizeStagingHttpTier([
      {
        id: "sovereign_health",
        route: "/api/sovereign/health",
        method: "GET",
        status: 200,
        redirect: false,
        contentType: "application/json",
        classification: "OBSERVED_HTTP",
        ok: true,
        violations: [],
      },
    ]);
    expect(summary.tier).toBe("OBSERVED_STAGING_HTTP");
    expect(summary.full_protocol_lifecycle_certified).toBe(false);
  });
});
