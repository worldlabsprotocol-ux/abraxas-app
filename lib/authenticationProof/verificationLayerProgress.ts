// FILE: lib/authenticationProof/verificationLayerProgress.ts
// Progress math for the seven verification-layer items.

import type { VerificationLayerItem, VerificationLayerStatus } from "./verificationLayerStatus";

export function verificationLayerProgress(status: VerificationLayerStatus): {
  done: number;
  total: number;
  percent: number;
  isFullyReady: boolean;
  liveIds: string[];
  partialIds: string[];
  blockedIds: string[];
} {
  const total = status.items.length;
  const live = status.items.filter((i) => i.status === "live");
  const partial = status.items.filter((i) => i.status === "partial");
  const blocked = status.items.filter((i) => i.status === "not_configured");
  const done = live.length;

  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    isFullyReady: done === total,
    liveIds: live.map((i) => i.id),
    partialIds: partial.map((i) => i.id),
    blockedIds: blocked.map((i) => i.id),
  };
}

export function nextVerificationBlockers(items: VerificationLayerItem[]): string[] {
  const open = items.filter((i) => i.status !== "live");
  if (!open.length) return [];
  return open[0].blockers;
}
