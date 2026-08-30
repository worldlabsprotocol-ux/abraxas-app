// FILE: examples/good-trouble-wix/backend/flowCapacity.js
// Shared capacity enforcement — purge stale rows before counting; rollback on overrun.

/**
 * @param {import("./nonceLifecycle.js").FlowStore} store
 * @param {Date} [now]
 */
export async function purgeStaleFlows(store, now = new Date()) {
  if (typeof store.purgeStale === "function") {
    await store.purgeStale(now);
  }
}

/**
 * Pre-insert capacity gate (after purge). Not fully atomic alone — pair with finalizeFlowStart.
 * @returns {Promise<{ ok: true } | { ok: false, code: "rate_limited" }>}
 */
export async function assertCapacityAvailable(store, maxPending, now = new Date()) {
  await purgeStaleFlows(store, now);
  if (typeof store.countPending !== "function") return { ok: true };
  const pending = await store.countPending(now);
  if (pending >= maxPending) {
    return { ok: false, code: "rate_limited" };
  }
  return { ok: true };
}

/**
 * Post-insert capacity check — removes the just-inserted row if concurrent starts exceeded cap.
 * @param {import("./nonceLifecycle.js").FlowStore} store
 * @param {string} recordId
 * @param {number} maxPending
 * @param {Date} [now]
 */
export async function finalizeFlowStart(store, recordId, maxPending, now = new Date()) {
  await purgeStaleFlows(store, now);
  if (typeof store.countPending !== "function" || typeof store.removeById !== "function") {
    return { ok: true };
  }
  const pending = await store.countPending(now);
  if (pending > maxPending) {
    await store.removeById(recordId);
    return { ok: false, code: "rate_limited" };
  }
  return { ok: true };
}
