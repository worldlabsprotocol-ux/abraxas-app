import { describe, expect, it } from "vitest";
import { buildStagingInfraInventory } from "./stagingInfraInventory";
import {
  deriveConfigurationReadiness,
  deriveOperationalStagingTier,
} from "./stagingCertificationTiers";
import { STAGING_HTTP_SMOKE_PROBES, evaluateStagingHttpProbe } from "./stagingHttpProbeSpec";

describe("Build #559 staging certification helpers", () => {
  it("inventory never includes raw secrets", () => {
    const inv = buildStagingInfraInventory({
      ABRAXAS_DATABASE_URL: "postgresql://user:supersecret@127.0.0.1:5432/abraxas_sovereign_staging",
      ABRAXAS_SIGNING_KEY: '{"kty":"OKP"}',
    });
    expect(JSON.stringify(inv)).not.toContain("supersecret");
    expect(inv.primary_postgres?.database).toBe("abraxas_sovereign_staging");
  });

  it("configuration readiness is separate from operational staging", () => {
    expect(
      deriveConfigurationReadiness({ staging_persistent_ready: true, inventory_complete: true }),
    ).toBe("STAGING_CONFIGURATION_READY");
    expect(
      deriveOperationalStagingTier({
        configuration_ready: true,
        observed_database_connectivity: false,
        observed_http_staging_health: false,
        observed_persistent_storage: false,
      }),
    ).toBe("STAGING_NOT_OPERATIONAL");
    expect(
      deriveOperationalStagingTier({
        configuration_ready: true,
        observed_database_connectivity: true,
        observed_http_staging_health: true,
        observed_persistent_storage: true,
      }),
    ).toBe("OPERATIONAL_STAGING");
  });

  it("rejects 404 health as certification success", () => {
    const spec = STAGING_HTTP_SMOKE_PROBES.find((p) => p.id === "sovereign_health")!;
    const result = evaluateStagingHttpProbe({
      spec,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      bodyText: "{}",
    });
    expect(result.ok).toBe(false);
  });
});
