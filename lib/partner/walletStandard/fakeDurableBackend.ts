// FILE: lib/partner/walletStandard/fakeDurableBackend.ts
// In-test durable stand-in. Production and DEMO never import this for fallback.

type ChallengeRow = {
  challenge_id: string;
  partner_id: string;
  origin_hash: string;
  action_contract_nonce_hash: string;
  nonce_hash: string;
  message_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
};

type BindingRow = {
  binding_ref: string;
  partner_id: string;
  action_contract_nonce_hash: string;
  pubkey_hash: string;
  origin_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
};

type NonceRow = {
  partner_id: string;
  nonce_hash: string;
  expires_at: string;
  consumed_at: string;
};

export type FakeWalletInsert = { table: string; row: Record<string, unknown> };

const challenges = new Map<string, ChallengeRow>();
const bindings = new Map<string, BindingRow>();
const nonces = new Map<string, NonceRow>();
export const fakeWalletInserts: FakeWalletInsert[] = [];
export let fakeWalletSchemaMissing = false;
export let fakeWalletAdminMissing = false;

export function resetFakeWalletStandardBackend(): void {
  challenges.clear();
  bindings.clear();
  nonces.clear();
  fakeWalletInserts.length = 0;
  fakeWalletSchemaMissing = false;
  fakeWalletAdminMissing = false;
}

export function setFakeWalletSchemaMissing(value: boolean): void {
  fakeWalletSchemaMissing = value;
}

export function setFakeWalletAdminMissing(value: boolean): void {
  fakeWalletAdminMissing = value;
}

function schemaError() {
  return { code: "PGRST205", message: "Could not find the table in the schema cache" };
}

function uniqueError() {
  return { code: "23505", message: "duplicate key value violates unique constraint" };
}

function nowIso(): string {
  return new Date().toISOString();
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

function insertChallenge(row: ChallengeRow): { error: { code?: string; message?: string } | null } {
  if (fakeWalletSchemaMissing) return { error: schemaError() };
  for (const existing of challenges.values()) {
    if (existing.challenge_id === row.challenge_id) return { error: uniqueError() };
    if (existing.partner_id === row.partner_id && existing.nonce_hash === row.nonce_hash) return { error: uniqueError() };
    if (existing.partner_id === row.partner_id && existing.message_hash === row.message_hash) return { error: uniqueError() };
  }
  challenges.set(row.challenge_id, { ...row, consumed_at: null, revoked_at: null });
  fakeWalletInserts.push({ table: "wallet_standard_challenges", row: { ...row } });
  return { error: null };
}

function insertBinding(row: BindingRow): { error: { code?: string; message?: string } | null } {
  if (fakeWalletSchemaMissing) return { error: schemaError() };
  for (const existing of bindings.values()) {
    if (existing.binding_ref === row.binding_ref) return { error: uniqueError() };
    if (
      existing.partner_id === row.partner_id
      && existing.action_contract_nonce_hash === row.action_contract_nonce_hash
      && existing.pubkey_hash === row.pubkey_hash
    ) {
      return { error: uniqueError() };
    }
  }
  bindings.set(row.binding_ref, { ...row, consumed_at: null, revoked_at: null });
  fakeWalletInserts.push({ table: "wallet_standard_bindings", row: { ...row } });
  return { error: null };
}

function insertNonce(row: NonceRow): { error: { code?: string; message?: string } | null } {
  if (fakeWalletSchemaMissing) return { error: schemaError() };
  const key = `${row.partner_id}::${row.nonce_hash}`;
  if (nonces.has(key)) return { error: uniqueError() };
  nonces.set(key, row);
  fakeWalletInserts.push({ table: "partner_venue_action_nonces", row: { ...row } });
  return { error: null };
}

function consumeChallenge(challengeId: string, partnerId: string) {
  if (fakeWalletSchemaMissing) return { data: null, error: schemaError() };
  const row = challenges.get(challengeId);
  if (!row || row.partner_id !== partnerId) return { data: { ok: false, code: "missing" }, error: null };
  if (row.consumed_at) return { data: { ok: false, code: "replayed" }, error: null };
  if (row.revoked_at) return { data: { ok: false, code: "revoked" }, error: null };
  if (isExpired(row.expires_at)) return { data: { ok: false, code: "expired" }, error: null };
  row.consumed_at = nowIso();
  return {
    data: {
      ok: true,
      code: "consumed",
      expires_at: row.expires_at,
      origin_hash: row.origin_hash,
      action_contract_nonce_hash: row.action_contract_nonce_hash,
      message_hash: row.message_hash,
    },
    error: null,
  };
}

function consumeBinding(bindingRef: string, partnerId: string) {
  if (fakeWalletSchemaMissing) return { data: null, error: schemaError() };
  const row = bindings.get(bindingRef);
  if (!row || row.partner_id !== partnerId) return { data: { ok: false, code: "missing" }, error: null };
  if (row.consumed_at) return { data: { ok: false, code: "replayed" }, error: null };
  if (row.revoked_at) return { data: { ok: false, code: "revoked" }, error: null };
  if (isExpired(row.expires_at)) return { data: { ok: false, code: "expired" }, error: null };
  row.consumed_at = nowIso();
  return { data: { ok: true, code: "consumed", expires_at: row.expires_at }, error: null };
}

function revokeBinding(bindingRef: string, partnerId: string) {
  if (fakeWalletSchemaMissing) return { data: null, error: schemaError() };
  const row = bindings.get(bindingRef);
  if (!row || row.partner_id !== partnerId) return { data: { ok: false, code: "missing" }, error: null };
  if (row.revoked_at) return { data: { ok: false, code: "missing" }, error: null };
  row.revoked_at = nowIso();
  return { data: { ok: true, code: "revoked" }, error: null };
}

function consumeNonce(partnerId: string, nonceHash: string, expiresAt: string) {
  if (fakeWalletSchemaMissing) return { data: null, error: schemaError() };
  if (isExpired(expiresAt)) return { data: { ok: false, code: "expired" }, error: null };
  const inserted = insertNonce({
    partner_id: partnerId,
    nonce_hash: nonceHash,
    expires_at: expiresAt,
    consumed_at: nowIso(),
  });
  if (inserted.error?.code === "23505") return { data: { ok: false, code: "replayed" }, error: null };
  if (inserted.error) return { data: null, error: inserted.error };
  return { data: { ok: true, code: "consumed" }, error: null };
}

function tableRows(table: string): Array<Record<string, unknown>> {
  if (table === "wallet_standard_challenges") return [...challenges.values()];
  if (table === "wallet_standard_bindings") return [...bindings.values()];
  if (table === "partner_venue_action_nonces") return [...nonces.values()];
  return [];
}

export function createWalletStandardAdminClient() {
  return {
    from(table: string) {
      const filters: Array<[string, string]> = [];
      return {
        insert(row: Record<string, unknown>) {
          const payload = { ...row } as Record<string, unknown>;
          if (table === "wallet_standard_challenges") {
            return Promise.resolve(insertChallenge(payload as ChallengeRow));
          }
          if (table === "wallet_standard_bindings") {
            return Promise.resolve(insertBinding(payload as BindingRow));
          }
          if (table === "partner_venue_action_nonces") {
            return Promise.resolve(insertNonce(payload as unknown as NonceRow));
          }
          return Promise.resolve({ error: schemaError() });
        },
        select() {
          return this;
        },
        eq(column: string, value: string) {
          filters.push([column, value]);
          return this;
        },
        maybeSingle() {
          if (fakeWalletSchemaMissing) return Promise.resolve({ data: null, error: schemaError() });
          const match = tableRows(table).find((row) => filters.every(([column, value]) => String(row[column] ?? "") === value));
          return Promise.resolve({ data: match ?? null, error: null });
        },
      };
    },
    rpc(name: string, args: Record<string, string>) {
      if (name === "wallet_standard_consume_challenge") {
        return Promise.resolve(consumeChallenge(args.p_challenge_id, args.p_partner_id));
      }
      if (name === "wallet_standard_consume_binding") {
        return Promise.resolve(consumeBinding(args.p_binding_ref, args.p_partner_id));
      }
      if (name === "wallet_standard_revoke_binding") {
        return Promise.resolve(revokeBinding(args.p_binding_ref, args.p_partner_id));
      }
      if (name === "venue_consume_action_nonce") {
        return Promise.resolve(consumeNonce(args.p_partner_id, args.p_nonce_hash, args.p_expires_at));
      }
      return Promise.resolve({ data: null, error: { message: "Could not find the function" } });
    },
  };
}

export function requireWalletStandardTestAdmin() {
  if (fakeWalletAdminMissing) {
    throw new Error("supabase_admin_missing");
  }
  return createWalletStandardAdminClient();
}
