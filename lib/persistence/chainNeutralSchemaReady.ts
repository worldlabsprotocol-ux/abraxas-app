// FILE: lib/persistence/chainNeutralSchemaReady.ts
// Runtime probe for migration 136 objects — allows #676 merge before Production apply.
//
// This module is reachable from client components, so it must not statically
// import server-only modules (admin/env -> pgPool). Both the PostgREST admin
// client and the direct-PostgreSQL probe are loaded lazily inside the functions.

const HOLDER_SUBJECTS_TABLE = "passport_holder_subjects";

let cachedReady: boolean | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 30_000;

function resetChainNeutralSchemaCacheForTests(): void {
  cachedReady = null;
  cachedAtMs = 0;
}

export { resetChainNeutralSchemaCacheForTests };

/**
 * True when migration 136 holder-subject tables and identity_verifications.holder_subject_id exist.
 * Production without 136 returns false — legacy Sui/zkLogin paths remain available; chain-neutral fails closed.
 */
export async function chainNeutralIdentitySchemaReady(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRefresh && cachedReady !== null && now - cachedAtMs < CACHE_TTL_MS) {
    return cachedReady;
  }

  try {
    const { persistenceUsesDirectPostgres } = await import("@/lib/persistence/env");
    if (persistenceUsesDirectPostgres()) {
      const { chainNeutralIdentitySchemaReadyDirect } = await import("./chainNeutralSchemaDirect");
      cachedReady = await chainNeutralIdentitySchemaReadyDirect();
      cachedAtMs = now;
      return cachedReady;
    }
    const { requirePersistenceAdmin } = await import("@/lib/persistence/admin");
    const sb = requirePersistenceAdmin();
    const { error: subjectsError } = await sb
      .from(HOLDER_SUBJECTS_TABLE)
      .select("subject_id", { head: true, count: "exact" })
      .limit(0);
    if (subjectsError) {
      cachedReady = false;
      cachedAtMs = now;
      return false;
    }

    const { error: columnError } = await sb
      .from("identity_verifications")
      .select("holder_subject_id", { head: true, count: "exact" })
      .limit(0);
    cachedReady = !columnError;
    cachedAtMs = now;
    return cachedReady;
  } catch {
    cachedReady = false;
    cachedAtMs = now;
    return false;
  }
}

export type ChainNeutralSchemaGate =
  | { ok: true }
  | { ok: false; code: "chain_neutral_schema_unavailable"; httpStatus: 503 };

export async function requireChainNeutralIdentitySchema(): Promise<ChainNeutralSchemaGate> {
  if (await chainNeutralIdentitySchemaReady()) return { ok: true };
  return { ok: false, code: "chain_neutral_schema_unavailable", httpStatus: 503 };
}

let cachedDocReady: boolean | null = null;
let cachedDocAtMs = 0;

/** True when passport_documents.holder_subject_id exists (migration 137). */
export async function chainNeutralIdvDocumentSchemaReady(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRefresh && cachedDocReady !== null && now - cachedDocAtMs < CACHE_TTL_MS) {
    return cachedDocReady;
  }
  if (!await chainNeutralIdentitySchemaReady(forceRefresh)) {
    cachedDocReady = false;
    cachedDocAtMs = now;
    return false;
  }

  try {
    const { persistenceUsesDirectPostgres } = await import("@/lib/persistence/env");
    if (persistenceUsesDirectPostgres()) {
      const { chainNeutralIdvDocumentSchemaReadyDirect } = await import("./chainNeutralSchemaDirect");
      cachedDocReady = await chainNeutralIdvDocumentSchemaReadyDirect();
      cachedDocAtMs = now;
      return cachedDocReady;
    }
    const { requirePersistenceAdmin } = await import("@/lib/persistence/admin");
    const sb = requirePersistenceAdmin();
    const { error } = await sb
      .from("passport_documents")
      .select("holder_subject_id", { head: true, count: "exact" })
      .limit(0);
    cachedDocReady = !error;
    cachedDocAtMs = now;
    return cachedDocReady;
  } catch {
    cachedDocReady = false;
    cachedDocAtMs = now;
    return false;
  }
}

export async function requireChainNeutralIdvDocumentSchema(): Promise<ChainNeutralSchemaGate> {
  if (await chainNeutralIdvDocumentSchemaReady()) return { ok: true };
  return { ok: false, code: "chain_neutral_schema_unavailable", httpStatus: 503 };
}
