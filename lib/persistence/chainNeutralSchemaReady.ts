// FILE: lib/persistence/chainNeutralSchemaReady.ts
// Runtime probe for migration 136 objects — allows #676 merge before Production apply.

import { requirePersistenceAdmin } from "@/lib/persistence/admin";

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
