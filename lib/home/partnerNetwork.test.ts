// FILE: lib/home/partnerNetwork.test.ts

import { describe, expect, it } from "vitest";
import {
  DESIGN_PARTNER_NETWORK_CARDS,
  LIVE_PARTNER_NETWORK_CARDS,
  PARTNER_NETWORK_CARDS,
  PARTNER_NETWORK_CANNABIS_FEATURED_IMAGE,
  partnerNetworkStatusEmoji,
  partnerNetworkStatusLabel,
} from "./partnerNetwork";

describe("partnerNetwork", () => {
  it("keeps live and design partner lists separate", () => {
    expect(LIVE_PARTNER_NETWORK_CARDS).toHaveLength(1);
    expect(DESIGN_PARTNER_NETWORK_CARDS).toHaveLength(2);
    expect(LIVE_PARTNER_NETWORK_CARDS.every((c) => c.status === "live")).toBe(true);
    expect(DESIGN_PARTNER_NETWORK_CARDS.every((c) => c.status === "design_partner")).toBe(true);
  });

  it("orders cards as live first, then design partners", () => {
    expect(PARTNER_NETWORK_CARDS.map((c) => c.id)).toEqual([
      "good-trouble",
      "smakd",
      "premiere",
    ]);
  });

  it("labels status accurately", () => {
    expect(partnerNetworkStatusLabel("live")).toBe("Live");
    expect(partnerNetworkStatusLabel("design_partner")).toBe("Design Partner");
    expect(partnerNetworkStatusEmoji("live")).toBe("🟢");
    expect(partnerNetworkStatusEmoji("design_partner")).toBe("🟡");
  });

  it("uses event photography for cannabis ecosystem featured visual", () => {
    expect(PARTNER_NETWORK_CANNABIS_FEATURED_IMAGE.src).toMatch(
      /^\/assets\/partner-network\//,
    );
    expect(PARTNER_NETWORK_CANNABIS_FEATURED_IMAGE.alt.length).toBeGreaterThan(12);
  });

  it("assigns featured image to Premiere design partner card only", () => {
    const premiere = DESIGN_PARTNER_NETWORK_CARDS.find((c) => c.id === "premiere");
    const smakd = DESIGN_PARTNER_NETWORK_CARDS.find((c) => c.id === "smakd");
    expect(premiere?.image?.src).toBe(PARTNER_NETWORK_CANNABIS_FEATURED_IMAGE.src);
    expect(smakd?.image).toBeUndefined();
  });
});
