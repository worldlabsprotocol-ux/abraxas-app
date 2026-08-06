// FILE: lib/admin/identityReviewPendingCount.ts
// Count pending identity-review queue items (distinct capture sessions).

export interface IdentityReviewDocumentRow {
  id: string;
  capture_session_id: string | null;
  status: string;
}

const PENDING_STATUSES = new Set(["submitted", "under_review"]);

export function countPendingIdentityReviewSessions(rows: IdentityReviewDocumentRow[]): number {
  const sessions = new Set<string>();

  for (const row of rows) {
    if (!PENDING_STATUSES.has(row.status)) continue;
    sessions.add(row.capture_session_id ?? row.id);
  }

  return sessions.size;
}
