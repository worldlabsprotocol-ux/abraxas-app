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

type EvmChallengeRow = {
  challenge_id: string;
  partner_id: string;
  origin_hash: string;
  policy_hash: string;
  action_hash: string;
  network_hash: string;
  action_contract_nonce_hash: string;
  nonce_hash: string;
  message_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
  reason_class: string;
};

type EvmBindingRow = {
  binding_ref: string;
  partner_id: string;
  address_hash: string;
  origin_hash: string;
  policy_hash: string;
  action_hash: string;
  network_hash: string;
  action_contract_nonce_hash: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
  reason_class: string;
};

export type FakeWalletInsert = { table: string; row: Record<string, unknown> };

const challenges = new Map<string, ChallengeRow>();
const bindings = new Map<string, BindingRow>();
const nonces = new Map<string, NonceRow>();
const chainNonces = new Map<string, { partner_id: string; network_id: string; nonce_hash: string; expires_at: string }>();
const evmChallenges = new Map<string, EvmChallengeRow>();
const evmBindings = new Map<string, EvmBindingRow>();
const onchainDeployments = new Map<string, Record<string, unknown>>();
const onchainDeploymentEvents: Record<string, unknown>[] = [];
export const fakeWalletInserts: FakeWalletInsert[] = [];
export let fakeWalletSchemaMissing = false;
export let fakeWalletAdminMissing = false;

export function resetFakeWalletStandardBackend(): void {
  challenges.clear();
  bindings.clear();
  nonces.clear();
  chainNonces.clear();
  evmChallenges.clear();
  evmBindings.clear();
  onchainDeployments.clear();
  onchainDeploymentEvents.length = 0;
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
  for (const existing of Array.from(challenges.values())) {
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
  for (const existing of Array.from(bindings.values())) {
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

function insertEvmChallenge(row: EvmChallengeRow): { error: { code?: string; message?: string } | null } {
  if (fakeWalletSchemaMissing) return { error: schemaError() };
  for (const existing of Array.from(evmChallenges.values())) {
    if (existing.challenge_id === row.challenge_id) return { error: uniqueError() };
    if (existing.partner_id === row.partner_id && existing.nonce_hash === row.nonce_hash) return { error: uniqueError() };
    if (existing.partner_id === row.partner_id && existing.message_hash === row.message_hash) return { error: uniqueError() };
  }
  evmChallenges.set(row.challenge_id, { ...row, consumed_at: null, revoked_at: null });
  fakeWalletInserts.push({ table: "evm_wallet_challenges", row: { ...row } });
  return { error: null };
}

function insertEvmBinding(row: EvmBindingRow): { error: { code?: string; message?: string } | null } {
  if (fakeWalletSchemaMissing) return { error: schemaError() };
  for (const existing of Array.from(evmBindings.values())) {
    if (existing.binding_ref === row.binding_ref) return { error: uniqueError() };
    if (
      existing.partner_id === row.partner_id
      && existing.action_contract_nonce_hash === row.action_contract_nonce_hash
      && existing.address_hash === row.address_hash
    ) {
      return { error: uniqueError() };
    }
  }
  evmBindings.set(row.binding_ref, { ...row, consumed_at: null, revoked_at: null });
  fakeWalletInserts.push({ table: "evm_wallet_bindings", row: { ...row } });
  return { error: null };
}

function consumeEvmChallenge(challengeId: string, partnerId: string) {
  if (fakeWalletSchemaMissing) return { data: null, error: schemaError() };
  const row = evmChallenges.get(challengeId);
  if (!row || row.partner_id !== partnerId) return { data: { ok: false, code: "missing" }, error: null };
  if (row.consumed_at) return { data: { ok: false, code: "replayed" }, error: null };
  if (row.revoked_at) return { data: { ok: false, code: "revoked" }, error: null };
  if (isExpired(row.expires_at)) return { data: { ok: false, code: "expired" }, error: null };
  row.consumed_at = nowIso();
  row.reason_class = "consumed";
  return {
    data: {
      ok: true,
      code: "consumed",
      expires_at: row.expires_at,
      origin_hash: row.origin_hash,
      policy_hash: row.policy_hash,
      action_hash: row.action_hash,
      network_hash: row.network_hash,
      action_contract_nonce_hash: row.action_contract_nonce_hash,
      message_hash: row.message_hash,
    },
    error: null,
  };
}

function consumeEvmBinding(bindingRef: string, partnerId: string) {
  if (fakeWalletSchemaMissing) return { data: null, error: schemaError() };
  const row = evmBindings.get(bindingRef);
  if (!row || row.partner_id !== partnerId) return { data: { ok: false, code: "missing" }, error: null };
  if (row.consumed_at) return { data: { ok: false, code: "replayed" }, error: null };
  if (row.revoked_at) return { data: { ok: false, code: "revoked" }, error: null };
  if (isExpired(row.expires_at)) return { data: { ok: false, code: "expired" }, error: null };
  row.consumed_at = nowIso();
  row.reason_class = "consumed";
  return { data: { ok: true, code: "consumed", expires_at: row.expires_at }, error: null };
}

function revokeEvmBinding(bindingRef: string, partnerId: string) {
  if (fakeWalletSchemaMissing) return { data: null, error: schemaError() };
  const row = evmBindings.get(bindingRef);
  if (!row || row.partner_id !== partnerId) return { data: { ok: false, code: "missing" }, error: null };
  if (row.revoked_at) return { data: { ok: false, code: "missing" }, error: null };
  row.revoked_at = nowIso();
  row.reason_class = "revoked";
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
  if (table === "wallet_standard_challenges") return Array.from(challenges.values());
  if (table === "wallet_standard_bindings") return Array.from(bindings.values());
  if (table === "partner_venue_action_nonces") return Array.from(nonces.values());
  if (table === "evm_wallet_challenges") return Array.from(evmChallenges.values());
  if (table === "evm_wallet_bindings") return Array.from(evmBindings.values());
  if (table === "onchain_gate_deployments") return Array.from(onchainDeployments.values());
  if (table === "onchain_gate_deployment_events") return onchainDeploymentEvents;
  return [];
}

function identityKey(row: Record<string, unknown>): string {
  return [
    row.partner_id,
    row.application_id,
    row.gate_type,
    row.network_id,
    String(row.gate_address ?? "").toLowerCase(),
    row.program_id ?? "",
    row.gate_config_pda ?? "",
  ].join("::");
}

function insertOnchainDeployment(row: Record<string, unknown>): { error: { code?: string; message?: string } | null } {
  if (fakeWalletSchemaMissing) return { error: schemaError() };
  if (onchainDeployments.has(String(row.deployment_ref))) return { error: uniqueError() };
  for (const existing of Array.from(onchainDeployments.values())) {
    if (identityKey(existing) === identityKey(row)) return { error: uniqueError() };
  }
  onchainDeployments.set(String(row.deployment_ref), { ...row });
  fakeWalletInserts.push({ table: "onchain_gate_deployments", row: { ...row } });
  return { error: null };
}

export function createWalletStandardAdminClient() {
  return {
    from(table: string) {
      const filters: Array<[string, string]> = [];
      const builder = {
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
          if (table === "evm_wallet_challenges") {
            return Promise.resolve(insertEvmChallenge(payload as EvmChallengeRow));
          }
          if (table === "evm_wallet_bindings") {
            return Promise.resolve(insertEvmBinding(payload as EvmBindingRow));
          }
          if (table === "onchain_gate_deployments") {
            return Promise.resolve(insertOnchainDeployment(payload));
          }
          if (table === "onchain_gate_deployment_events") {
            if (fakeWalletSchemaMissing) return Promise.resolve({ error: schemaError() });
            onchainDeploymentEvents.push({ ...payload });
            fakeWalletInserts.push({ table, row: { ...payload } });
            return Promise.resolve({ error: null });
          }
          return Promise.resolve({ error: schemaError() });
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(column: string, value: string) {
              filters.push([column, value]);
              return this;
            },
            then(onFulfilled: (value: { data: unknown; error: unknown }) => unknown) {
              if (fakeWalletSchemaMissing) return Promise.resolve({ data: null, error: schemaError() }).then(onFulfilled);
              if (table !== "onchain_gate_deployments") {
                return Promise.resolve({ data: null, error: schemaError() }).then(onFulfilled);
              }
              const match = tableRows(table).find((row) => filters.every(([column, value]) => String(row[column] ?? "") === value));
              if (!match) return Promise.resolve({ data: null, error: null }).then(onFulfilled);
              Object.assign(match, patch);
              return Promise.resolve({ data: match, error: null }).then(onFulfilled);
            },
          };
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
        then(onFulfilled: (value: { data: unknown; error: unknown }) => unknown) {
          if (fakeWalletSchemaMissing) return Promise.resolve({ data: null, error: schemaError() }).then(onFulfilled);
          const rows = tableRows(table).filter((row) => filters.every(([column, value]) => String(row[column] ?? "") === value));
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
        },
      };
      return builder;
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
      if (name === "evm_wallet_consume_challenge") {
        return Promise.resolve(consumeEvmChallenge(args.p_challenge_id, args.p_partner_id));
      }
      if (name === "evm_wallet_consume_binding") {
        return Promise.resolve(consumeEvmBinding(args.p_binding_ref, args.p_partner_id));
      }
      if (name === "evm_wallet_revoke_binding") {
        return Promise.resolve(revokeEvmBinding(args.p_binding_ref, args.p_partner_id));
      }
      if (name === "chain_attestation_consume_nonce") {
        if (fakeWalletSchemaMissing) return Promise.resolve({ data: null, error: schemaError() });
        if (isExpired(args.p_expires_at)) return Promise.resolve({ data: { ok: false, code: "expired" }, error: null });
        const key = `${args.p_partner_id}::${args.p_network_id}::${args.p_nonce_hash}`;
        if (chainNonces.has(key)) return Promise.resolve({ data: { ok: false, code: "replayed" }, error: null });
        chainNonces.set(key, {
          partner_id: args.p_partner_id,
          network_id: args.p_network_id,
          nonce_hash: args.p_nonce_hash,
          expires_at: args.p_expires_at,
        });
        return Promise.resolve({ data: { ok: true, code: "consumed" }, error: null });
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
