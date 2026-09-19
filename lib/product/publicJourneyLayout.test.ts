import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("public product mobile layout", () => {
  it("lets code blocks scroll horizontally without widening the page", () => {
    const css = read("app/globals.css");
    expect(css).toContain("pre, .abx-code-scroll");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("max-width: 100%");
  });

  it("wraps primary navigation and next-step clusters on small screens", () => {
    const nav = read("components/redesign/RedesignNav.tsx");
    expect(nav).toContain("flexWrap");
    expect(nav).toContain("rd-nav-mobile");
    const next = read("components/product/PublicJourneyNextSteps.tsx");
    expect(next).toContain("flexWrap");
    expect(next).toContain("maxWidth");
    const cards = [
      "app/examples/trading-venue/TradingVenueExampleClient.tsx",
      "app/examples/payment-authorization/PaymentAuthorizationExampleClient.tsx",
      "app/developers/page.tsx",
      "app/verification/page.tsx",
    ];
    for (const file of cards) {
      expect(read(file), file).toMatch(/flexWrap|overflowX|overflow-x/);
    }
  });
});
