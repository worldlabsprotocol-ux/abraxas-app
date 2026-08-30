// FILE: examples/good-trouble-wix/backend/memoryNonceStore.js
// In-memory flow store for tests — mirrors guarded update + purge semantics.

import { CONSUMED_FLOW_RETENTION_MS, NONCE_STATE } from "./constants.js";

/** @returns {import("./nonceLifecycle.js").FlowStore} */
export function createMemoryNonceStore() {
  /** @type {Map<string, import("./nonceLifecycle.js").FlowRecord>} */
  const byId = new Map();
  /** @type {Map<string, string>} */
  const idByFlowId = new Map();
  let seq = 0;
  /** @type {Promise<void>} */
  let writeLock = Promise.resolve();

  function withWriteLock(fn) {
    const run = writeLock.then(fn);
    writeLock = run.catch(() => {});
    return run;
  }

  return {
    async insert(record) {
      return withWriteLock(async () => {
        const _id = `flow_${++seq}`;
        const stored = { ...record, _id };
        byId.set(_id, structuredClone(stored));
        idByFlowId.set(record.flowId, _id);
        return structuredClone(stored);
      });
    },
    async findByFlowId(flowId) {
      const id = idByFlowId.get(flowId);
      if (!id) return null;
      const record = byId.get(id);
      return record ? structuredClone(record) : null;
    },
    async updateGuarded(recordId, patch, guards = {}) {
      return withWriteLock(async () => {
        const current = byId.get(recordId);
        if (!current) return null;
        if (guards.expectedState && current.state !== guards.expectedState) return null;
        if (guards.flowId && current.flowId !== guards.flowId) return null;

        const next = { ...current, ...patch, _id: recordId };
        byId.set(recordId, structuredClone(next));
        return structuredClone(next);
      });
    },
    async countPending(now = new Date()) {
      const ts = now.getTime();
      let count = 0;
      for (const record of byId.values()) {
        if (record.state === NONCE_STATE.PENDING && record.expiresAt.getTime() > ts) {
          count += 1;
        }
      }
      return count;
    },
    async removeById(recordId) {
      return withWriteLock(async () => {
        const current = byId.get(recordId);
        if (!current) return;
        byId.delete(recordId);
        idByFlowId.delete(current.flowId);
      });
    },
    async purgeStale(now = new Date()) {
      return withWriteLock(async () => {
        const ts = now.getTime();
        const consumedCutoff = ts - CONSUMED_FLOW_RETENTION_MS;
        for (const [recordId, record] of byId.entries()) {
          const expiredPending = record.expiresAt.getTime() <= ts;
          const staleConsumed = record.state === NONCE_STATE.CONSUMED
            && record.consumedAt
            && record.consumedAt.getTime() <= consumedCutoff;
          if (expiredPending || staleConsumed) {
            byId.delete(recordId);
            idByFlowId.delete(record.flowId);
          }
        }
      });
    },
  };
}
