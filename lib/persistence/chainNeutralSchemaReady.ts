// FILE: lib/persistence/chainNeutralSchemaReady.ts
// Runtime probe for migration 136 objects — allows #676 merge before Production apply.
//
import "server-only";

let cachedReady: boolean | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 30_000;

function resetChainNeutralSchemaCacheForTests(): void {
  cachedReady = null;
  cachedAtMs = 0;
}

export { resetChainNeutralSchemaCacheForTests };

/**
 * True when the sovereign Passport database contains the chain-neutral identity schema.
 * Passport never probes PostgREST as a fallback; a missing sovereign binding fails closed.
 */
export async function chainNeutralIdentitySchemaReady(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRefresh && cachedReady !== null && now - cachedAtMs < CACHE_TTL_MS) {
    return cachedReady;
  }

  try {
    const { isPassportDirectPostgresEnabled } = await import("@/lib/persistence/env");
    if (!isPassportDirectPostgresEnabled()) {
      cachedReady = false;
      cachedAtMs = now;
      return false;
    }
    const { chainNeutralIdentitySchemaReadyDirect } = await import("./chainNeutralSchemaDirect");
    cachedReady = await chainNeutralIdentitySchemaReadyDirect();
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
    const { isPassportDirectPostgresEnabled } = await import("@/lib/persistence/env");
    if (!isPassportDirectPostgresEnabled()) return false;
    const { chainNeutralIdvDocumentSchemaReadyDirect } = await import("./chainNeutralSchemaDirect");
    cachedDocReady = await chainNeutralIdvDocumentSchemaReadyDirect();
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
