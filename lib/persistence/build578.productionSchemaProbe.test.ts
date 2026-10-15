// FILE: lib/persistence/build578.productionSchemaProbe.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PASSPORT_SCHEMA_PROBE_KEYS,
  PASSPORT_REUSABLE_LIFECYCLE_SCHEMA_MATRIX,
} from "./passportSchemaDependencyMatrix";

describe("Build #578 production schema probe spec", () => {
  it("maps every matrix row to a probe key covered in production-schema-probes.sql", () => {
    const sql = readFileSync(
      join(process.cwd(), "scripts/build-578/production-schema-probes.sql"),
      "utf8",
    );
    for (const key of PASSPORT_SCHEMA_PROBE_KEYS) {
      expect(sql, `missing probe key ${key}`).toContain(`'${key}'`);
    }
  });

  it("includes migrations 140 through 143 in the reusable lifecycle matrix", () => {
    const migrations = new Set(PASSPORT_REUSABLE_LIFECYCLE_SCHEMA_MATRIX.map((r) => r.migration));
    expect(migrations.has("140_passport_reusable_credential_state.sql")).toBe(true);
    expect(migrations.has("141_passport_institutional_presentation_consent.sql")).toBe(true);
    expect(migrations.has("142_passport_institutional_authorization_commits.sql")).toBe(true);
    expect(migrations.has("143_passport_authorization_signing_claim.sql")).toBe(true);
  });

  it("retains Build #577 probe file for backward compatible spot checks", () => {
    const legacy = readFileSync(
      join(process.cwd(), "scripts/build-577/schema-compatibility-probes.sql"),
      "utf8",
    );
    expect(legacy).toContain("migration_140_reusable_credentials");
    expect(legacy).toContain("migration_143_signing_claim_columns");
  });
});
