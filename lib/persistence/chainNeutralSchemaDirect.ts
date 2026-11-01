// FILE: lib/persistence/chainNeutralSchemaDirect.ts
// Dynamically imported by client-reachable modules; pg access stays server-side
// via the lazy pool in ./pgPool, so no `server-only` poison here.

import { queryAbraxasPg } from "./pgPool";

async function tableExists(table: string): Promise<boolean> {
  const result = await queryAbraxasPg<{ n: string }>(
    `select count(*)::text as n from information_schema.tables
     where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return result.rows[0]?.n === "1";
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await queryAbraxasPg<{ n: string }>(
    `select count(*)::text as n from information_schema.columns
     where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [table, column],
  );
  return result.rows[0]?.n === "1";
}

export async function chainNeutralIdentitySchemaReadyDirect(): Promise<boolean> {
  if (!await tableExists("passport_holder_subjects")) return false;
  if (!await tableExists("passport_holder_wallet_accounts")) return false;
  if (!await columnExists("passport_holder_wallet_accounts", "revoked_at")) return false;
  if (!await tableExists("passport_solana_auth_challenges")) return false;
  if (!await columnExists("identity_verifications", "holder_subject_id")) return false;
  const result = await queryAbraxasPg<{ present: boolean }>(
    `select to_regprocedure('public.consume_passport_solana_auth_challenge(text,text,text)') is not null as present`,
  );
  return result.rows[0]?.present === true;
}

export async function chainNeutralIdvDocumentSchemaReadyDirect(): Promise<boolean> {
  if (!await chainNeutralIdentitySchemaReadyDirect()) return false;
  return columnExists("passport_documents", "holder_subject_id");
}
