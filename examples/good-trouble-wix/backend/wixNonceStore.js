// FILE: examples/good-trouble-wix/backend/wixNonceStore.js
// wix-data adapter — collection must be Admin-only (no site/member read/write).
// Backend web methods use suppressAuth internally; never expose via web-method args.

import wixData from "wix-data";
import { CONSUMED_FLOW_RETENTION_MS, NONCE_COLLECTION, NONCE_STATE } from "./constants.js";

/** @internal Elevated write access for backend-only web methods. */
const BACKEND_WRITE_OPTIONS = { suppressAuth: true };

/** @internal Elevated read access for lifecycle and capacity decisions. */
const BACKEND_READ_OPTIONS = { suppressAuth: true, consistentRead: true };

/**
 * Collection permissions (Wix CMS — AbraxasVerificationNonces):
 * - Read: Admin only
 * - Create: Admin only
 * - Update: Admin only
 * - Delete: Admin only
 *
 * Only backend web methods operate on this collection via suppressAuth.
 *
 * @returns {import("./nonceLifecycle.js").FlowStore}
 */
export function createWixNonceStore() {
  return {
    async insert(record) {
      return wixData.insert(NONCE_COLLECTION, record, BACKEND_WRITE_OPTIONS);
    },
    async findByFlowId(flowId) {
      const { items } = await wixData.query(NONCE_COLLECTION)
        .eq("flowId", flowId)
        .limit(1)
        .find(BACKEND_READ_OPTIONS);
      return items[0] ?? null;
    },
    async updateGuarded(recordId, patch, guards = {}) {
      const current = await wixData.get(NONCE_COLLECTION, recordId, BACKEND_READ_OPTIONS);
      if (!current) return null;
      if (guards.expectedState && current.state !== guards.expectedState) return null;
      if (guards.flowId && current.flowId !== guards.flowId) return null;
      return wixData.update(
        NONCE_COLLECTION,
        { ...current, ...patch, _id: recordId },
        BACKEND_WRITE_OPTIONS,
      );
    },
    async countPending(now = new Date()) {
      const totalCount = await wixData.query(NONCE_COLLECTION)
        .eq("state", NONCE_STATE.PENDING)
        .gt("expiresAt", now)
        .count(BACKEND_READ_OPTIONS);

      if (
        !Number.isSafeInteger(totalCount) ||
        totalCount < 0
      ) {
        throw new Error("Invalid pending-flow count returned by Wix Data");
      }

      return totalCount;
    },
    async removeById(recordId) {
      return wixData.remove(NONCE_COLLECTION, recordId, BACKEND_WRITE_OPTIONS);
    },
    async purgeStale(now = new Date()) {
      const consumedCutoff = new Date(now.getTime() - CONSUMED_FLOW_RETENTION_MS);
      const { items: expired } = await wixData.query(NONCE_COLLECTION)
        .le("expiresAt", now)
        .limit(100)
        .find(BACKEND_READ_OPTIONS);
      const { items: staleConsumed } = await wixData.query(NONCE_COLLECTION)
        .eq("state", NONCE_STATE.CONSUMED)
        .le("consumedAt", consumedCutoff)
        .limit(100)
        .find(BACKEND_READ_OPTIONS);
      const toRemove = new Map();
      for (const item of [...expired, ...staleConsumed]) {
        toRemove.set(item._id, item);
      }
      for (const id of toRemove.keys()) {
        await wixData.remove(NONCE_COLLECTION, id, BACKEND_WRITE_OPTIONS);
      }
      return toRemove.size;
    },
  };
}
