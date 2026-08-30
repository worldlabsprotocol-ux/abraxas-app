// FILE: examples/good-trouble-wix/backend/memoryNonceStore.js
// In-memory nonce store for tests — mirrors guarded update semantics.

/** @returns {import("./nonceLifecycle.js").NonceStore} */
export function createMemoryNonceStore() {
  /** @type {Map<string, import("./nonceLifecycle.js").NonceRecord>} */
  const byId = new Map();
  /** @type {Map<string, string>} */
  const idByHash = new Map();
  let seq = 0;

  return {
    async insert(record) {
      const _id = `nonce_${++seq}`;
      const stored = { ...record, _id };
      byId.set(_id, structuredClone(stored));
      idByHash.set(record.nonceHash, _id);
      return structuredClone(stored);
    },
    async findByHash(nonceHash) {
      const id = idByHash.get(nonceHash);
      if (!id) return null;
      const record = byId.get(id);
      return record ? structuredClone(record) : null;
    },
    async updateGuarded(recordId, patch, guards = {}) {
      const current = byId.get(recordId);
      if (!current) return null;
      if (guards.expectedState && current.state !== guards.expectedState) return null;
      if (guards.sessionBinding && current.sessionBinding !== guards.sessionBinding) return null;

      const next = { ...current, ...patch, _id: recordId };
      byId.set(recordId, structuredClone(next));
      return structuredClone(next);
    },
  };
}
