// FILE: scripts/demo/lib/demoRestProbeRegistry.ts
// Privilege-aware REST probe plans derived from the frozen service_role matrix.

import { DEMO_REQUIRED_TABLES } from "./demoMigrationManifest";
import {
  DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
  type TablePrivilege,
} from "./demoServiceRolePrivilegeExpectations";

export type RestTableProbeMode =
  | "select_head_count"
  | "catalog_validated_write_only"
  | "registry_missing";

export interface RestTableProbePlan {
  table: string;
  mode: RestTableProbeMode;
  optional: boolean;
  expectedPrivileges: readonly TablePrivilege[];
  evidence: string;
}

const PRIVILEGE_BY_TABLE = new Map(
  DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS.map((entry) => [entry.table, entry.privileges]),
);

/**
 * Required tables excluded from REST SELECT head/count probes (frozen; audit_events only).
 * Independent of post-073 effective privileges — audit_events keeps INSERT+SELECT in catalog
 * validation but must not be SELECT-probed via Supabase REST.
 */
export const DEMO_REST_WRITE_ONLY_REQUIRED_TABLES = ["audit_events"] as const satisfies readonly (typeof DEMO_REQUIRED_TABLES)[number][];

const FROZEN_WRITE_ONLY_REQUIRED_TABLES = new Set<string>(DEMO_REST_WRITE_ONLY_REQUIRED_TABLES);

export function isFrozenWriteOnlyRequiredTable(table: string): boolean {
  return FROZEN_WRITE_ONLY_REQUIRED_TABLES.has(table);
}

export function getServiceRolePrivileges(table: string): readonly TablePrivilege[] | undefined {
  return PRIVILEGE_BY_TABLE.get(table);
}

export function serviceRoleExpectsSelect(table: string): boolean {
  if (FROZEN_WRITE_ONLY_REQUIRED_TABLES.has(table)) {
    return false;
  }
  const privileges = PRIVILEGE_BY_TABLE.get(table);
  if (!privileges) {
    return true;
  }
  return privileges.includes("SELECT");
}

export function getRestTableProbePlan(table: string, optional: boolean): RestTableProbePlan {
  const registryPrivileges = PRIVILEGE_BY_TABLE.get(table);

  if (!optional && registryPrivileges === undefined) {
    return {
      table,
      mode: "registry_missing",
      optional,
      expectedPrivileges: [],
      evidence:
        "Required table absent from frozen DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS registry",
    };
  }

  if (!optional && isFrozenWriteOnlyRequiredTable(table)) {
    const privilegeList = registryPrivileges!.join(", ");
    return {
      table,
      mode: "catalog_validated_write_only",
      optional,
      expectedPrivileges: registryPrivileges!,
      evidence:
        `No REST SELECT probe (effective privileges: ${privilegeList}; catalog-validated only); `
        + "use catalog mode to validate table existence and privileges",
    };
  }

  return {
    table,
    mode: "select_head_count",
    optional,
    expectedPrivileges: registryPrivileges ?? [],
    evidence: `client.from("${table}").select("*", { count: "exact", head: true })`,
  };
}
