// FILE: lib/home/ecosystemContent.test.ts

import { describe, expect, it } from "vitest";
import {
  LIVE_ECOSYSTEM_PARTNERS,
  REGULATED_INDUSTRY_PILLARS,
  VERIFIED_ASSET_CARDS,
  WITHOUT_ABRAXAS_INDUSTRIES,
  WITH_ABRAXAS_INDUSTRIES,
} from "./ecosystemContent";

describe("ecosystemContent", () => {
  it("lists four industries for without/with Abraxas comparison", () => {
    expect(WITHOUT_ABRAXAS_INDUSTRIES).toHaveLength(4);
    expect(WITH_ABRAXAS_INDUSTRIES).toHaveLength(4);
    expect(WITHOUT_ABRAXAS_INDUSTRIES.map((i) => i.id)).toEqual(WITH_ABRAXAS_INDUSTRIES.map((i) => i.id));
  });

  it("includes regulated industry pillars", () => {
    expect(REGULATED_INDUSTRY_PILLARS.map((p) => p.title)).toEqual([
      "Cannabis",
      "Real Estate",
      "Digital Assets",
      "Financial Services",
    ]);
  });

  it("surfaces live ecosystem partners", () => {
    expect(LIVE_ECOSYSTEM_PARTNERS.some((p) => p.title.includes("Good Trouble"))).toBe(true);
    expect(LIVE_ECOSYSTEM_PARTNERS.some((p) => p.title.includes("Chickasaw"))).toBe(true);
  });

  it("positions verified assets as trust signals", () => {
    expect(VERIFIED_ASSET_CARDS[0]?.summary).toBe("Age verification");
    expect(VERIFIED_ASSET_CARDS[1]?.summary).toBe("Property verification");
  });
});
