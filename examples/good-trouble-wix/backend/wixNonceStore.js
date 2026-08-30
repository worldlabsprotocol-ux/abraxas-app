// FILE: examples/good-trouble-wix/backend/wixNonceStore.js
// wix-data adapter — collection must be backend-only (no site/member read/write).

import wixData from "wix-data";
import { NONCE_COLLECTION } from "./constants.js";

/**
 * Collection permissions (Wix CMS):
 * - Site visitors: no read, create, update, or delete
 * - Site members: no read, create, update, or delete
 * - Admin / backend web methods only
 *
 * Stored fields: nonceHash, sessionBinding, state, createdAt, expiresAt,
 * claimExpiresAt, claimToken, validationAttempts, consumedAt, correlationId.
 * Never store raw nonce, receipt JSON, DOB, document data, API keys, or credentials.
 *
 * @returns {import("./nonceLifecycle.js").NonceStore}
 */
export function createWixNonceStore() {
  return {
    async insert(record) {
      return wixData.insert(NONCE_COLLECTION, record);
    },
    async findByHash(nonceHash) {
      const { items } = await wixData.query(NONCE_COLLECTION)
        .eq("nonceHash", nonceHash)
        .limit(1)
        .find();
      return items[0] ?? null;
    },
    async updateGuarded(recordId, patch, guards = {}) {
      const current = await wixData.get(NONCE_COLLECTION, recordId);
      if (!current) return null;
      if (guards.expectedState && current.state !== guards.expectedState) return null;
      if (guards.sessionBinding && current.sessionBinding !== guards.sessionBinding) return null;
      return wixData.update(NONCE_COLLECTION, { ...current, ...patch, _id: recordId });
    },
  };
}
