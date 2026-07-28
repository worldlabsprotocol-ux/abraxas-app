// FILE: lib/home/ecosystemContent.test.ts

import { describe, expect, it } from "vitest";
import {
  LIVE_ECOSYSTEM_PARTNERS,
  REGULATED_INDUSTRY_PILLARS,
  VERIFIED_ECOSYSTEM_CARDS,
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

  it("surfaces live ecosystem partners including genesis asset", () => {
    expect(LIVE_ECOSYSTEM_PARTNERS[0]?.title).toBe("Cielo Sunrise");
    expect(LIVE_ECOSYSTEM_PARTNERS.some((p) => p.title.includes("Good Trouble"))).toBe(true);
    expect(LIVE_ECOSYSTEM_PARTNERS.some((p) => p.title.includes("Chickasaw"))).toBe(true);
  });

  it("positions verified ecosystem with Cielo, cannabis, land, and passport", () => {
    expect(VERIFIED_ECOSYSTEM_CARDS.map((c) => c.title)).toEqual([
      "Cielo Sunrise",
      "Good Trouble Canna",
      "Chickasaw Project",
      "Abraxas Passport",
      "More integrations coming",
    ]);
  });
});
