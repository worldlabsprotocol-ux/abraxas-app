// FILE: lib/listingInventory/lotInventory.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { applyLotStatusUpdates } from "@/lib/listingInventory/applyLotUpdates";
import {
  getLotInventory,
  lotStatusFingerprint,
  resetLotInventoryForTests,
} from "@/lib/listingInventory/lotInventory";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

describe("lotInventory", () => {
  beforeEach(() => {
    resetLotInventoryForTests();
  });

  it("returns static fallback for CPG when memory is empty", async () => {
    const inventory = await getLotInventory(CPG_ASSET.id);
    expect(inventory.lots.length).toBe(11);
    expect(inventory.source).toBe("static_fallback");
    expect(inventory.summary.underContract).toBeGreaterThan(0);
  });

  it("updates lot status in memory and changes fingerprint", async () => {
    const before = await getLotInventory(CPG_ASSET.id);
    const beforeFp = lotStatusFingerprint(before.lots);

    const applied = await applyLotStatusUpdates({
      assetId: CPG_ASSET.id,
      updates: [{ lot: 4, status: "under_contract", notes: "MLS offer accepted" }],
      source: "partner:test",
      partnerId: "cpg-land",
    });

    expect(applied.changed).toBe(true);
    expect(applied.results[0]?.fromStatus).toBe("available");
    expect(applied.results[0]?.toStatus).toBe("under_contract");

    const after = await getLotInventory(CPG_ASSET.id);
    expect(after.source).toBe("database");
    expect(lotStatusFingerprint(after.lots)).not.toBe(beforeFp);
    expect(after.lots.find(l => l.lot === 4)?.status).toBe("under_contract");
  });

  it("is idempotent when status unchanged", async () => {
    await applyLotStatusUpdates({
      assetId: CPG_ASSET.id,
      updates: [{ lot: 2, status: "available" }],
      source: "partner:test",
    });

    const second = await applyLotStatusUpdates({
      assetId: CPG_ASSET.id,
      updates: [{ lot: 2, status: "available" }],
      source: "partner:test",
    });

    expect(second.changed).toBe(false);
  });
});
