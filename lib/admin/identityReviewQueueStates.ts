// FILE: lib/admin/identityReviewQueueStates.ts
// Identity review queue tab states for /admin/identity (matches existing queue API filters).

export type IdentityReviewQueueTabId = "pending" | "approved" | "resubmit" | "rejected";

export interface IdentityReviewQueueTab {
  id: IdentityReviewQueueTabId;
  label: string;
  /** Value passed to GET /api/admin/identity/queue?status= */
  queryStatus: string;
}

export const IDENTITY_REVIEW_QUEUE_TABS: IdentityReviewQueueTab[] = [
  { id: "pending", label: "Pending", queryStatus: "pending" },
  { id: "approved", label: "Reviewed / Approved", queryStatus: "accepted" },
  { id: "resubmit", label: "Resubmit", queryStatus: "resubmission_requested" },
  { id: "rejected", label: "Rejected", queryStatus: "rejected" },
];

export const DEFAULT_IDENTITY_REVIEW_QUEUE_TAB: IdentityReviewQueueTabId = "pending";

export function resolveIdentityReviewQueueTab(
  raw: string | null | undefined,
): IdentityReviewQueueTab {
  const match = IDENTITY_REVIEW_QUEUE_TABS.find(tab => tab.id === raw || tab.queryStatus === raw);
  return match ?? IDENTITY_REVIEW_QUEUE_TABS[0];
}

export function identityReviewQueueHref(tabId: IdentityReviewQueueTabId = DEFAULT_IDENTITY_REVIEW_QUEUE_TAB): string {
  const tab = IDENTITY_REVIEW_QUEUE_TABS.find(t => t.id === tabId) ?? IDENTITY_REVIEW_QUEUE_TABS[0];
  return `/admin/identity?status=${encodeURIComponent(tab.queryStatus)}`;
}
