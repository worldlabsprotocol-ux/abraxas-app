// FILE: scripts/demo/lib/demoProvisionerSchemaPreflight.test.ts

import { describe, expect, it } from "vitest";
import {
  assertProvisionerSchemaCompatible,
  DemoProvisionerSchemaError,
  PROVISIONER_REQUIRED_COLUMNS,
  PROVISIONER_SCHEMA_PREFLIGHT_SQL,
} from "./demoProvisionerSchemaPreflight";
import type { ProvisionerPgExecutor } from "./demoProvisionerPgSession";

function createSchemaExecutor(
  present: Set<string>,
): ProvisionerPgExecutor {
  return {
    async query(sql: string) {
      if (sql !== PROVISIONER_SCHEMA_PREFLIGHT_SQL) {
        throw new Error(`Unexpected query: ${sql.slice(0, 80)}`);
      }

      return {
        rows: PROVISIONER_REQUIRED_COLUMNS.map(({ table, column }) => ({
          table_name: table,
          column_name: column,
          column_exists: present.has(`${table}.${column}`),
        })),
      };
    },
    async tryAdvisoryLock() {
      return true;
    },
    async advisoryUnlock() {
      return undefined;
    },
  };
}

describe("demoProvisionerSchemaPreflight", () => {
  it("does not require optional identity_verifications.veriff_session_id", () => {
    expect(
      PROVISIONER_REQUIRED_COLUMNS.some(
        ({ table, column }) => table === "identity_verifications" && column === "veriff_session_id",
      ),
    ).toBe(false);
  });

  it("passes when all required columns exist", async () => {
    const present = new Set(
      PROVISIONER_REQUIRED_COLUMNS.map(({ table, column }) => `${table}.${column}`),
    );
    await expect(assertProvisionerSchemaCompatible(createSchemaExecutor(present))).resolves.toBeUndefined();
  });

  it("fails before apply mutations when required columns are missing", async () => {
    const present = new Set(
      PROVISIONER_REQUIRED_COLUMNS.map(({ table, column }) => `${table}.${column}`),
    );
    present.delete("identity_verifications.veriff_decision_id");

    await expect(assertProvisionerSchemaCompatible(createSchemaExecutor(present))).rejects.toBeInstanceOf(
      DemoProvisionerSchemaError,
    );

    try {
      await assertProvisionerSchemaCompatible(createSchemaExecutor(present));
    } catch (error) {
      expect(error).toBeInstanceOf(DemoProvisionerSchemaError);
      const schemaError = error as DemoProvisionerSchemaError;
      expect(schemaError.missingColumns).toEqual([
        { table: "identity_verifications", column: "veriff_decision_id" },
      ]);
      expect(schemaError.message).toContain("identity_verifications.veriff_decision_id");
    }
  });
});
