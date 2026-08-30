// FILE: examples/good-trouble-wix/backend/wixNonceStore.js
// wix-data adapter — collection must be Admin-only (no site/member read/write).

import wixData from "wix-data";
import { CONSUMED_FLOW_RETENTION_MS, NONCE_COLLECTION, NONCE_STATE } from "./constants.js";

/**
 * Collection permissions (Wix CMS — AbraxasVerificationNonces):
 * - Read: Admin only
 * - Create: Admin only
 * - Update: Admin only
 * - Delete: Admin only
 *
 * Only backend web methods operate on this collection.
 *
 * @returns {import("./nonceLifecycle.js").FlowStore}
 */
export function createWixNonceStore() {
  return {
    async insert(record) {
      return wixData.insert(NONCE_COLLECTION, record);
    },
    async findByFlowId(flowId) {
      const { items } = await wixData.query(NONCE_COLLECTION)
        .eq("flowId", flowId)
        .limit(1)
        .find();
      return items[0] ?? null;
    },
    async updateGuarded(recordId, patch, guards = {}) {
      const current = await wixData.get(NONCE_COLLECTION, recordId);
      if (!current) return null;
      if (guards.expectedState && current.state !== guards.expectedState) return null;
      if (guards.flowId && current.flowId !== guards.flowId) return null;
      return wixData.update(NONCE_COLLECTION, { ...current, ...patch, _id: recordId });
    },
    async countPending(now = new Date()) {
      const { totalCount } = await wixData.query(NONCE_COLLECTION)
        .eq("state", NONCE_STATE.PENDING)
        .gt("expiresAt", now)
        .count();
      return totalCount ?? 0;
    },
    async removeById(recordId) {
      return wixData.remove(NONCE_COLLECTION, recordId);
    },
    async purgeStale(now = new Date()) {
      const consumedCutoff = new Date(now.getTime() - CONSUMED_FLOW_RETENTION_MS);
      const { items: expired } = await wixData.query(NONCE_COLLECTION)
        .le("expiresAt", now)
        .limit(100)
        .find();
      const { items: staleConsumed } = await wixData.query(NONCE_COLLECTION)
        .eq("state", NONCE_STATE.CONSUMED)
        .le("consumedAt", consumedCutoff)
        .limit(100)
        .find();
      const toRemove = new Map();
      for (const item of [...expired, ...staleConsumed]) {
        toRemove.set(item._id, item);
      }
      for (const id of toRemove.keys()) {
        await wixData.remove(NONCE_COLLECTION, id);
      }
      return toRemove.size;
    },
  };
}
