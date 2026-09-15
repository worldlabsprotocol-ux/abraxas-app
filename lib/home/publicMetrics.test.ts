// FILE: lib/home/publicMetrics.test.ts

import { describe, expect, it } from "vitest";
import { buildHomeStatCards, buildHomepageStatCards, formatMetricValue } from "./publicMetrics";

describe("publicMetrics", () => {
  it("formats numbers with locale grouping", () => {
    expect(formatMetricValue(1200)).toBe("1,200");
  });

  it("returns empty string for missing values", () => {
    expect(formatMetricValue(null)).toBe("");
    expect(formatMetricValue(undefined)).toBe("");
  });

  it("builds qualifying stat cards from API metrics", () => {
    const cards = buildHomeStatCards({
      verified_assets: 3,
      active_credentials: 12,
      verification_network: {
        manual_idv_pending: 2,
        manual_idv_approved: 8,
        credentials_issued_30d: 5,
      },
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ key: "active_credentials", value: "12", numeric: 12 });
  });

  it("handles empty metrics payload gracefully", () => {
    const cards = buildHomeStatCards(null);
    expect(cards).toEqual([]);
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

  it("includes credentials issued when above homepage volume threshold", () => {
    const cards = buildHomepageStatCards({
      verification_network: { credentials_issued_30d: 12 },
    });
    expect(cards[0]).toMatchObject({ key: "credentials_30d", numeric: 12 });
  });
});
