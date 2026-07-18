// FILE: lib/assetMonitoring/feeds/listingStatusFeed.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { runListingStatusFeed } from "@/lib/assetMonitoring/feeds/listingStatusFeed";
import { resetListingSnapshotsForTests } from "@/lib/assetMonitoring/listingStatus/snapshotStore";
import {
  LISTING_MONITOR_CONFIGS,
} from "@/lib/assetMonitoring/listingStatus/sources";
import { getStaticLotInventory } from "@/lib/listingInventory/staticLots";
import { lotStatusFingerprint } from "@/lib/listingInventory/lotInventory";
import { listingSnapshotKey } from "@/lib/assetMonitoring/listingStatus/types";
import { loadListingSnapshots, saveListingSnapshots } from "@/lib/assetMonitoring/listingStatus/snapshotStore";

describe("runListingStatusFeed", () => {
  beforeEach(() => {
    resetListingSnapshotsForTests();
  });

  it("seeds snapshots on first run without emitting signals", async () => {
    const signals = await runListingStatusFeed(new Date("2026-07-18"));
    expect(signals).toHaveLength(0);

    const snapshots = await loadListingSnapshots();
    expect(Object.keys(snapshots).length).toBeGreaterThan(0);
    expect(snapshots[listingSnapshotKey("ABX-RE-HOSP-001", "pipeline_stage")]?.status).toBe(
      "MARKETPLACE_LIVE",
    );
  });

  it("emits a signal when a seeded snapshot changes", async () => {
    await runListingStatusFeed(new Date("2026-07-18"));

    const snapshots = await loadListingSnapshots();
    const cpgKey = listingSnapshotKey("ABX-RE-LAND-006", "mls_lot_status");
    snapshots[cpgKey] = {
      ...snapshots[cpgKey]!,
      status: "stale-fingerprint",
    };
    await saveListingSnapshots(snapshots);

    const signals = await runListingStatusFeed(new Date("2026-07-19"));
    expect(signals.some(s => s.assetId === "ABX-RE-LAND-006")).toBe(true);
    expect(signals.find(s => s.assetId === "ABX-RE-LAND-006")?.source).toBe("listing_status_feed");
  });

  it("is idempotent when listing state is unchanged", async () => {
    await runListingStatusFeed(new Date("2026-07-18"));
    const second = await runListingStatusFeed(new Date("2026-07-19"));
    expect(second).toHaveLength(0);
  });

  it("monitors CPG lot fingerprint from static registry", () => {
    const cpg = LISTING_MONITOR_CONFIGS.find(c => c.assetId === "ABX-RE-LAND-006");
    expect(cpg).toBeDefined();
    const fp = lotStatusFingerprint(getStaticLotInventory("ABX-RE-LAND-006"));
    expect(fp).toContain("under_contract");
  });
});
