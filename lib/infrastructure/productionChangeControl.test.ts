import { describe, expect, it } from "vitest";
import { getProductionChange, PRODUCTION_INFRASTRUCTURE_CHANGES } from "./productionChangeControl";

describe("productionChangeControl", () => {
  it("suspends Supabase Production metering migrations per Build #813", () => {
    expect(getProductionChange("supabase_migration_058_metering")?.status).toBe("suspended");
    expect(getProductionChange("supabase_migration_065_service_role_grants")?.status).toBe("suspended");
  });

  it("holds native account and billing gates", () => {
    expect(getProductionChange("supabase_native_account_migrations_144_147")?.status).toBe("hold");
    expect(getProductionChange("commercial_billing_collection")?.status).toBe("hold");
  });

  it("documents every gate with a reason", () => {
    for (const change of PRODUCTION_INFRASTRUCTURE_CHANGES) {
      expect(change.reason.length).toBeGreaterThan(10);
      expect(change.scope.length).toBeGreaterThan(3);
    }
  });
});
