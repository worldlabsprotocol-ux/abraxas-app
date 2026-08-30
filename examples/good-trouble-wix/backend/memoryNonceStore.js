// FILE: examples/good-trouble-wix/backend/memoryNonceStore.js
// In-memory flow store for tests — mirrors guarded update semantics.

import { NONCE_STATE } from "./constants.js";

/** @returns {import("./nonceLifecycle.js").FlowStore} */
export function createMemoryNonceStore() {
  /** @type {Map<string, import("./nonceLifecycle.js").FlowRecord>} */
  const byId = new Map();
  /** @type {Map<string, string>} */
  const idByFlowId = new Map();
  let seq = 0;

  return {
    async insert(record) {
      const _id = `flow_${++seq}`;
      const stored = { ...record, _id };
      byId.set(_id, structuredClone(stored));
      idByFlowId.set(record.flowId, _id);
      return structuredClone(stored);
    },
    async findByFlowId(flowId) {
      const id = idByFlowId.get(flowId);
      if (!id) return null;
      const record = byId.get(id);
      return record ? structuredClone(record) : null;
    },
    async updateGuarded(recordId, patch, guards = {}) {
      const current = byId.get(recordId);
      if (!current) return null;
      if (guards.expectedState && current.state !== guards.expectedState) return null;
      if (guards.flowId && current.flowId !== guards.flowId) return null;

      const next = { ...current, ...patch, _id: recordId };
      byId.set(recordId, structuredClone(next));
      return structuredClone(next);
    },
    async countPending() {
      const now = Date.now();
      let count = 0;
      for (const record of byId.values()) {
        if (record.state === NONCE_STATE.PENDING && record.expiresAt.getTime() > now) {
          count += 1;
        }
      }
      return count;
    },
  };
}
