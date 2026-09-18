// FILE: lib/settlement/circle/idempotency.ts
// Server-generated Circle idempotency keys. Never accept a partner or UI value.

import { randomUUID } from "node:crypto";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCircleUuidV4(value: string): boolean {
  return UUID_V4.test(value.trim());
}

/** UUID v4 for Circle mutating requests. Official IdempotencyKey format. */
export function createCircleIdempotencyKey(
  randomUuid: () => string = randomUUID,
): string {
  const key = randomUuid();
  if (!isCircleUuidV4(key)) {
    throw new Error("circle_idempotency_not_uuid_v4");
  }
  return key;
}

/**
 * Allocate n globally unique Circle idempotency keys.
 * Circle uniqueness is per API key, so these must never collide.
 */
export function allocateDistinctCircleIdempotencyKeys(
  count: number,
  randomUuid: () => string = randomUUID,
): string[] {
  const keys = new Set<string>();
  let guard = 0;
  while (keys.size < count) {
    keys.add(createCircleIdempotencyKey(randomUuid));
    guard += 1;
    if (guard > count * 50) {
      throw new Error("circle_idempotency_allocation_exhausted");
    }
  }
  return [...keys];
}
