// FILE: lib/home/publicMetrics.test.ts

import { describe, expect, it } from "vitest";
import { buildHomeStatCards, buildHomepageStatCards, formatMetricValue } from "./publicMetrics";

describe("publicMetrics", () => {
  it("formats numbers with locale grouping", () => {
    expect(formatMetricValue(1200)).toBe("1,200");
  });

  it("returns n/a for missing values", () => {
    expect(formatMetricValue(null)).toBe("n/a");
    expect(formatMetricValue(undefined)).toBe("n/a");
  });

  it("builds stat cards from API metrics", () => {
    const cards = buildHomeStatCards({
      verified_assets: 3,
      active_credentials: 12,
      verification_network: {
        manual_idv_pending: 2,
        manual_idv_approved: 8,
        credentials_issued_30d: 5,
      },
    });

    expect(cards).toHaveLength(4);
    expect(cards[0]).toMatchObject({ label: "Verified identities (beta)", value: "8", numeric: 8 });
    expect(cards[1]).toMatchObject({ label: "Verified assets (beta)", value: "3", numeric: 3 });
    expect(cards[2]).toMatchObject({ label: "Pending reviews (beta)", value: "2", numeric: 2 });
    expect(cards[3]).toMatchObject({ label: "Active credentials (beta)", value: "12", numeric: 12 });
  });

  it("handles empty metrics payload gracefully", () => {
    const cards = buildHomeStatCards(null);
    expect(cards.every((c) => c.value === "n/a" && c.numeric === null)).toBe(true);
  });

  it("filters low-volume metrics from the public homepage", () => {
    const cards = buildHomepageStatCards({
      verified_assets: 3,
      active_credentials: 12,
      verification_network: {
        manual_idv_pending: 2,
        manual_idv_approved: 8,
        credentials_issued_30d: 5,
      },
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ key: "active_credentials", numeric: 12 });
  });

  it("falls back credentials to verification_network when active_credentials missing", () => {
    const cards = buildHomeStatCards({
      verification_network: { credentials_issued_30d: 4 },
    });
    expect(cards[3]).toMatchObject({ label: "Active credentials (beta)", value: "4", numeric: 4 });
  });
});
