// FILE: lib/portal/ownerJourney.test.ts

import { describe, expect, it } from "vitest";
import { buildOwnerJourney } from "./ownerJourney";

describe("buildOwnerJourney", () => {
  it("marks wallet step current when no wallet linked", () => {
    const j = buildOwnerJourney({
      id: "app-1",
      status: "pending_review",
      asset_name: "Test parcel",
      asset_class: "REAL_ESTATE_LAND",
      contact_email: "dev@example.com",
      deal_status: "intake",
    });
    expect(j.steps.find(s => s.id === "wallet")?.current).toBe(true);
    expect(j.settle_url).toBeNull();
  });

  it("exposes settle URL when deal ready with amount", () => {
    const wallet = "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd";
    const j = buildOwnerJourney({
      id: "app-2",
      status: "verified",
      asset_name: "Riverside",
      asset_class: "REAL_ESTATE_LAND",
      contact_email: "dev@example.com",
      linked_wallet: wallet,
      public_verify_slug: "ABX-DEMO-LAND-001",
      review_signed_at: "2026-06-01T12:00:00Z",
      deal_status: "deal_ready",
      settlement_amount_usdc: 100,
    }, wallet);
    expect(j.deal_ready).toBe(true);
    expect(j.settle_url).toContain("/portal/settle");
    expect(j.steps.find(s => s.id === "settle")?.current).toBe(true);
  });
});
