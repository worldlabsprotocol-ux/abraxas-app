// FILE: lib/auth/nativeAccount/schemaReadiness.ts
// Non-destructive native auth schema probes (no secrets).

import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";
import { nativeAccountMemoryStoreEnabled } from "./featureFlag";
import { pgFunctionExists, pgTableExists } from "./schemaProbePg";

export type NativeAuthSchemaProbe = {
  ok: boolean;
  code: string | null;
  migrations: { migration_144: boolean; migration_145_atomic_rpc: boolean };
};

const NATIVE_TABLES = ["abraxas_accounts", "abraxas_account_passkeys", "abraxas_webauthn_challenges"] as const;

function isMissingTablePostgrestError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("does not exist") || msg.includes("could not find the table");
}

export async function probeNativeAuthSchemaReady(
  env: Record<string, string | undefined> = process.env,
): Promise<NativeAuthSchemaProbe> {
  if (nativeAccountMemoryStoreEnabled(env)) {
    return {
      ok: true,
      code: "memory_store",
      migrations: { migration_144: true, migration_145_atomic_rpc: true },
    };
  }

  if (isNativeAccountDirectPostgresEnabled(env)) {
    let migration144 = true;
    for (const table of NATIVE_TABLES) {
      if (!(await pgTableExists(table, env))) {
        migration144 = false;
        break;
      }
    }
    const migration145 = migration144
      && await pgFunctionExists("abraxas_consume_webauthn_challenge_atomic", env);
    const ok = migration144 && migration145;
    return {
      ok,
      code: ok ? null : migration144 ? "migration_145_missing" : "migration_144_missing",
      migrations: { migration_144: migration144, migration_145_atomic_rpc: migration145 },
    };
  }

  let sb;
  try {
    sb = requirePersistenceAdmin();
  } catch {
    return {
      ok: false,
      code: "persistence_not_configured",
      migrations: { migration_144: false, migration_145_atomic_rpc: false },
    };
  }

  let migration144 = true;
  for (const table of NATIVE_TABLES) {
    const { error } = await sb.from(table).select("*").limit(0);
    if (isMissingTablePostgrestError(error)) {
      migration144 = false;
      break;
    }
    if (error && error.code !== "PGRST116") {
      return {
        ok: false,
        code: "schema_probe_failed",
        migrations: { migration_144: false, migration_145_atomic_rpc: false },
      };
    }
  }

  let migration145 = false;
  if (migration144) {
    const { error } = await sb.rpc("abraxas_consume_webauthn_challenge_atomic", {
      p_challenge_id: "__probe_nonexistent__",
    });
    if (!error || error.code === "PGRST116" || error.message?.includes("challenge_unavailable")) {
      migration145 = true;
    } else if (error.code === "42883") {
      migration145 = false;
    } else {
      migration145 = true;
    }
  }

  const ok = migration144 && migration145;
  return {
    ok,
    code: ok ? null : migration144 ? "migration_145_missing" : "migration_144_missing",
    migrations: { migration_144: migration144, migration_145_atomic_rpc: migration145 },
  };
}
