// FILE: lib/auth/nativeAccount/solanaSchemaReadiness.ts

import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { nativeAccountMemoryStoreEnabled } from "./featureFlag";

export type SolanaAccountAuthSchemaProbe = {
  ok: boolean;
  code: string | null;
  migrations: { migration_144_accounts: boolean; migration_146_solana_auth: boolean };
};

const SOLANA_TABLES = [
  "abraxas_accounts",
  "abraxas_account_solana_wallets",
  "abraxas_account_solana_auth_challenges",
] as const;

function isMissingTablePostgrestError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("does not exist") || msg.includes("could not find the table");
}

export async function probeSolanaAccountAuthSchemaReady(
  env: Record<string, string | undefined> = process.env,
): Promise<SolanaAccountAuthSchemaProbe> {
  if (nativeAccountMemoryStoreEnabled(env)) {
    return {
      ok: true,
      code: "memory_store",
      migrations: { migration_144_accounts: true, migration_146_solana_auth: true },
    };
  }

  let sb;
  try {
    sb = requirePersistenceAdmin();
  } catch {
    return {
      ok: false,
      code: "persistence_not_configured",
      migrations: { migration_144_accounts: false, migration_146_solana_auth: false },
    };
  }

  let migration144 = true;
  for (const table of SOLANA_TABLES) {
    const { error } = await sb.from(table).select("*").limit(0);
    if (isMissingTablePostgrestError(error)) {
      if (table === "abraxas_accounts") migration144 = false;
      return {
        ok: false,
        code: table === "abraxas_accounts" ? "migration_144_missing" : "migration_146_missing",
        migrations: {
          migration_144_accounts: table !== "abraxas_accounts" ? migration144 : false,
          migration_146_solana_auth: table !== "abraxas_accounts",
        },
      };
    }
    if (error && error.code !== "PGRST116") {
      return {
        ok: false,
        code: "schema_probe_failed",
        migrations: { migration_144_accounts: false, migration_146_solana_auth: false },
      };
    }
  }

  let migration146 = false;
  const { error: rpcError } = await sb.rpc("abraxas_consume_account_solana_challenge_atomic", {
    p_challenge_id: "__probe__",
    p_wallet_address: "__probe__",
    p_session_context_hash: "__probe__",
  });
  if (!rpcError || rpcError.message?.includes("challenge_unavailable")) {
    migration146 = true;
  } else if (rpcError.code === "42883") {
    migration146 = false;
  } else {
    migration146 = true;
  }

  const ok = migration144 && migration146;
  return {
    ok,
    code: ok ? null : migration146 ? "migration_144_missing" : "migration_146_missing",
    migrations: { migration_144_accounts: migration144, migration_146_solana_auth: migration146 },
  };
}
