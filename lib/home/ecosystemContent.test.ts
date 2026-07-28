// FILE: lib/home/ecosystemContent.test.ts

import { describe, expect, it } from "vitest";
import {
  LIVE_ECOSYSTEM_PARTNERS,
  PROTOCOL_IN_ACTION_PROOFS,
  PROTOCOL_PASSPORT_CONNECTOR,
  REGULATED_INDUSTRY_PILLARS,
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

  it("orders protocol proofs as genesis → traditional → reusable eligibility", () => {
    expect(PROTOCOL_IN_ACTION_PROOFS.map((p) => p.id)).toEqual([
      "cielo",
      "chickasaw",
      "good-trouble",
    ]);
    expect(PROTOCOL_IN_ACTION_PROOFS[0]?.category).toBe("Genesis Asset");
    expect(PROTOCOL_IN_ACTION_PROOFS[2]?.category).toBe("Reusable Credentials");
  });

  it("finishes with passport as the connecting layer", () => {
    expect(PROTOCOL_PASSPORT_CONNECTOR.title).toBe("Abraxas Passport");
    expect(PROTOCOL_PASSPORT_CONNECTOR.demonstrates).toMatch(/connecting every use case/i);
  });

  it("surfaces Cielo in live ecosystem partners", () => {
    expect(LIVE_ECOSYSTEM_PARTNERS[0]?.title).toBe("Cielo Sunrise");
  });
});
