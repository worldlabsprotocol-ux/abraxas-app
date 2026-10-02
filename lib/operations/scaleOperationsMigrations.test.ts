// FILE: lib/operations/scaleOperationsMigrations.test.ts

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  SCALE_OPERATIONS_MIGRATION_ORDER,
  SCALE_OPERATIONS_MIGRATION_TABLES,
} from "./scaleOperationsMigrations";

describe("scale operations migrations", () => {
  it("lists migration files in apply order with on-disk SQL", () => {
    for (const file of SCALE_OPERATIONS_MIGRATION_ORDER) {
      expect(existsSync(resolve(process.cwd(), "supabase/migrations", file))).toBe(true);
      expect(SCALE_OPERATIONS_MIGRATION_TABLES[file]?.length).toBeGreaterThan(0);
    }
  });

  it("includes migration 125 transient tables and migration 126 oauth jti table", () => {
    expect(SCALE_OPERATIONS_MIGRATION_ORDER).toContain("125_scale_operations_durable_state.sql");
    expect(SCALE_OPERATIONS_MIGRATION_ORDER).toContain("126_zklogin_oauth_jti_consumed.sql");
    expect(SCALE_OPERATIONS_MIGRATION_TABLES["125_scale_operations_durable_state.sql"]).toEqual([
      "provenance_flow_sessions",
      "provenance_content_submissions",
      "organization_eligibility_consents",
      "sandbox_readiness_runs",
    ]);
    expect(SCALE_OPERATIONS_MIGRATION_TABLES["126_zklogin_oauth_jti_consumed.sql"]).toEqual([
      "zklogin_oauth_jti_consumed",
    ]);
  });
});
