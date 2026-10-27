// FILE: lib/developers/unifiedWorkspaceJourneyMetrics.ts
// Build 878 — observed route friction (Playwright / probes append only; no invented timings).

export type UnifiedWorkspaceRouteEvent = {
  at_ms: number;
  pathname: string;
  search: string;
  hash: string;
  trigger: string;
};

export type UnifiedWorkspaceFrictionRecord = {
  started_at: string;
  finished_at: string;
  base_url: string;
  route_events: UnifiedWorkspaceRouteEvent[];
  route_change_count: number;
  repeated_start_building_clicks: number;
  wallet_operational: boolean;
  manual_wallet_checkpoint_required: boolean;
  notes: string[];
};

export function createFrictionRecord(baseUrl: string): UnifiedWorkspaceFrictionRecord {
  return {
    started_at: new Date().toISOString(),
    finished_at: "",
    base_url: baseUrl.replace(/\/$/, ""),
    route_events: [],
    route_change_count: 0,
    repeated_start_building_clicks: 0,
    wallet_operational: false,
    manual_wallet_checkpoint_required: true,
    notes: [],
  };
}

export function recordRouteEvent(
  record: UnifiedWorkspaceFrictionRecord,
  input: { pathname: string; search: string; hash: string; trigger: string },
): void {
  const prev = record.route_events[record.route_events.length - 1];
  const nextPath = `${input.pathname}${input.search}${input.hash}`;
  if (prev) {
    const prevPath = `${prev.pathname}${prev.search}${prev.hash}`;
    if (nextPath !== prevPath) {
      record.route_change_count += 1;
    }
  }
  record.route_events.push({
    at_ms: Date.now(),
    pathname: input.pathname,
    search: input.search,
    hash: input.hash,
    trigger: input.trigger,
  });
}

export function finalizeFrictionRecord(record: UnifiedWorkspaceFrictionRecord): UnifiedWorkspaceFrictionRecord {
  return {
    ...record,
    finished_at: new Date().toISOString(),
  };
}
