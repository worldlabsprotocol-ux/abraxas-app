// FILE: lib/portal/applicationStatus.test.ts

import { describe, expect, it } from "vitest";
import { buildApplicationLifecycle } from "./applicationStatus";

describe("buildApplicationLifecycle", () => {
  it("marks registry listing live when public slug exists on pending_review", () => {
    const lc = buildApplicationLifecycle("app-1", {
      id: "app-1",
      status: "pending_review",
      asset_name: "Test Parcel",
      asset_class: "REAL_ESTATE_LAND",
      public_verify_slug: "ABX-LAND-TEST1234",
      registry_published_at: "2026-06-01T12:00:00Z",
      created_at: "2026-06-01T12:00:00Z",
    });
    expect(lc.listed).toBe(true);
    expect(lc.verify_url).toBe("/verify/ABX-LAND-TEST1234");
    expect(lc.steps[1]?.complete).toBe(true);
    expect(lc.verified).toBe(false);
  });

  it("marks submitted as current when no slug yet", () => {
    const lc = buildApplicationLifecycle("app-1", {
      id: "app-1",
      status: "pending_review",
      asset_name: "Test Parcel",
      asset_class: "REAL_ESTATE_LAND",
      created_at: "2026-06-01T12:00:00Z",
    });
    expect(lc.steps[0]?.current).toBe(true);
    expect(lc.listed).toBe(false);
    expect(lc.verify_url).toBeNull();
  });

  it("advances when named reviewer is assigned", () => {
    const lc = buildApplicationLifecycle("app-2", {
      id: "app-2",
      status: "under_review",
      asset_name: "Mineral tract",
      asset_class: "MINERAL_RIGHTS",
      named_reviewer: "Jane Reviewer",
      public_verify_slug: "ABX-MIN-ABCDEFGH",
    });
    expect(lc.steps[2]?.complete).toBe(true);
    expect(lc.steps[3]?.current).toBe(true);
  });

  it("exposes verify URL when signed with public slug", () => {
    const lc = buildApplicationLifecycle("app-3", {
      id: "app-3",
      status: "verified",
      asset_name: "Riverside",
      asset_class: "REAL_ESTATE_LAND",
      review_signed_at: "2026-06-10T12:00:00Z",
      public_verify_slug: "ABX-DEMO-LAND-001",
    });
    expect(lc.verified).toBe(true);
    expect(lc.verify_url).toBe("/verify/ABX-DEMO-LAND-001");
  });
});
