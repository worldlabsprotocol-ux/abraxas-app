// FILE: lib/passport/verificationActivity/connections.ts
// Holder-facing grouping for current service connections and historical results.

import type { PassportActivityItem } from "./contract";

export type PassportConnectionFilter = "current" | "history" | "all";

export interface PassportConnectionSummary {
  current: number;
  history: number;
  total: number;
}

export function summarizePassportConnections(
  items: PassportActivityItem[],
): PassportConnectionSummary {
  const current = items.filter(item => item.current).length;
  return {
    current,
    history: items.length - current,
    total: items.length,
  };
}

export function filterPassportConnections(
  items: PassportActivityItem[],
  filter: PassportConnectionFilter,
): PassportActivityItem[] {
  if (filter === "current") return items.filter(item => item.current);
  if (filter === "history") return items.filter(item => !item.current);
  return items;
}
