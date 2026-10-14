// FILE: lib/persistence/chainNeutralSchemaDirect.ts
import "server-only";

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
  return columnExists("identity_verifications", "holder_subject_id");
}

export async function chainNeutralIdvDocumentSchemaReadyDirect(): Promise<boolean> {
  if (!await chainNeutralIdentitySchemaReadyDirect()) return false;
  return columnExists("passport_documents", "holder_subject_id");
}
