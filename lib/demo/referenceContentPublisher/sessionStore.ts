// FILE: lib/demo/referenceContentPublisher/sessionStore.ts
// In-memory publish attempts for the reference publisher demo.

import type { ReferencePublisherDraft } from "./contract";

const store = new Map<string, ReferencePublisherDraft>();

export function saveReferencePublisherDraft(draft: ReferencePublisherDraft): void {
  store.set(draft.publish_attempt_id, draft);
}

export function loadReferencePublisherDraft(publishAttemptId: string): ReferencePublisherDraft | null {
  return store.get(publishAttemptId) ?? null;
}

export function updateReferencePublisherDraft(
  publishAttemptId: string,
  patch: Partial<ReferencePublisherDraft>,
): ReferencePublisherDraft | null {
  const current = store.get(publishAttemptId);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.set(publishAttemptId, next);
  return next;
}

export function resetReferencePublisherStoreForTests(): void {
  store.clear();
}
