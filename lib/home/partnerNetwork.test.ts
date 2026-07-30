// FILE: lib/home/partnerNetwork.test.ts

import { describe, expect, it } from "vitest";
import {
  DESIGN_PARTNER_NETWORK_CARDS,
  GOOD_TROUBLE_PARTNER_IMAGE,
  LIVE_PARTNER_NETWORK_CARDS,
  PARTNER_NETWORK_CARDS,
  PREMIERE_PARTNER_IMAGE,
  SMAKD_PARTNER_IMAGE,
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

  it("uses lookbook cover for Premiere, brand lifestyle for SMAK'D, and brand mark for Good Trouble", () => {
    const premiere = DESIGN_PARTNER_NETWORK_CARDS.find((c) => c.id === "premiere");
    const smakd = DESIGN_PARTNER_NETWORK_CARDS.find((c) => c.id === "smakd");
    const gt = LIVE_PARTNER_NETWORK_CARDS[0];
    expect(premiere?.image?.src).toBe(PREMIERE_PARTNER_IMAGE.src);
    expect(smakd?.image?.src).toBe(SMAKD_PARTNER_IMAGE.src);
    expect(gt?.image?.src).toMatch(/good-trouble-partner-brand/);
    expect(PREMIERE_PARTNER_IMAGE.src).toMatch(/premiere-lookbook-cover/);
    expect(SMAKD_PARTNER_IMAGE.src).toMatch(/smakd-brand-lifestyle/);
  });

  it("assigns contain fit to Good Trouble brand graphic", () => {
    expect(LIVE_PARTNER_NETWORK_CARDS[0]?.image?.fit).toBe("contain");
  });
});
