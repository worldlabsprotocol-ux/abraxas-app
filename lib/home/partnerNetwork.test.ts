// FILE: lib/home/partnerNetwork.test.ts

import { describe, expect, it } from "vitest";
import {
  DESIGN_PARTNER_NETWORK_CARDS,
  GOOD_TROUBLE_PARTNER_IMAGE,
  HOMEPAGE_PARTNER_INTEGRATION_CARDS,
  INTEGRATION_PARTNER_NETWORK_CARDS,
  PARTNER_NETWORK_CARDS,
  PREMIERE_PARTNER_IMAGE,
  SMAKD_PARTNER_IMAGE,
  partnerNetworkStatusEmoji,
  partnerNetworkStatusLabel,
} from "./partnerNetwork";

describe("partnerNetwork", () => {
  it("keeps integration and design partner lists separate", () => {
    expect(INTEGRATION_PARTNER_NETWORK_CARDS).toHaveLength(1);
    expect(DESIGN_PARTNER_NETWORK_CARDS).toHaveLength(2);
    expect(
      INTEGRATION_PARTNER_NETWORK_CARDS.every((c) => c.status === "integration_in_development"),
    ).toBe(true);
    expect(DESIGN_PARTNER_NETWORK_CARDS.every((c) => c.status === "design_partner")).toBe(true);
  });

  it("orders cards as integration first, then design partners", () => {
    expect(PARTNER_NETWORK_CARDS.map((c) => c.id)).toEqual([
      "good-trouble",
      "smakd",
      "premiere",
    ]);
  });

  it("labels status accurately with exhaustive mapping", () => {
    expect(partnerNetworkStatusLabel("integration_in_development")).toBe(
      "Integration in development",
    );
    expect(partnerNetworkStatusLabel("design_partner")).toBe("Design Partner");
    expect(partnerNetworkStatusEmoji("integration_in_development")).toBe("🟡");
    expect(partnerNetworkStatusEmoji("design_partner")).toBe("🟡");
  });

  it("describes Good Trouble integration honestly", () => {
    expect(INTEGRATION_PARTNER_NETWORK_CARDS[0]?.description).toBe(
      "Integration in development for reusable age-verification workflows through Abraxas Passport.",
    );
  });

  it("exposes homepage integration cards without design-partner brand wall", () => {
    expect(HOMEPAGE_PARTNER_INTEGRATION_CARDS.map((c) => c.id)).toEqual(["good-trouble"]);
    expect(HOMEPAGE_PARTNER_INTEGRATION_CARDS.every((c) => !c.image)).toBe(true);
  });

  it("uses script logo for Good Trouble in full partner registry", () => {
    const premiere = DESIGN_PARTNER_NETWORK_CARDS.find((c) => c.id === "premiere");
    const smakd = DESIGN_PARTNER_NETWORK_CARDS.find((c) => c.id === "smakd");
    const gt = INTEGRATION_PARTNER_NETWORK_CARDS[0];
    expect(premiere?.image?.src).toBe(PREMIERE_PARTNER_IMAGE.src);
    expect(smakd?.image?.src).toBe(SMAKD_PARTNER_IMAGE.src);
    expect(gt?.image).toBeUndefined();
    expect(GOOD_TROUBLE_PARTNER_IMAGE.src).toContain("good-trouble/brand-logo");
    expect(PREMIERE_PARTNER_IMAGE.src).toMatch(/premiere-lookbook-cover/);
    expect(SMAKD_PARTNER_IMAGE.src).toMatch(/smakd-brand-lifestyle/);
  });

  it("keeps Good Trouble registry image available outside homepage cards", () => {
    expect(GOOD_TROUBLE_PARTNER_IMAGE.fit).toBe("cover");
    expect(GOOD_TROUBLE_PARTNER_IMAGE.mediaBackground).toBe("#c45c2a");
  });
});
