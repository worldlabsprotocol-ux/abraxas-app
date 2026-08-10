// FILE: lib/home/ecosystemContent.test.ts

import { describe, expect, it } from "vitest";
import {
  PROTOCOL_IN_ACTION_PROOFS,
  PROTOCOL_PASSPORT_CONNECTOR,
  REGULATED_INDUSTRY_PILLARS,
  WITHOUT_ABRAXAS_INDUSTRIES,
  WITH_ABRAXAS_INDUSTRIES,
} from "./ecosystemContent";
import { GOOD_TROUBLE_PROOF_LINE } from "@/lib/positioningStrategy";

describe("ecosystemContent", () => {
  it("lists four industries for without/with Abraxas comparison", () => {
    expect(WITHOUT_ABRAXAS_INDUSTRIES).toHaveLength(4);
    expect(WITH_ABRAXAS_INDUSTRIES).toHaveLength(4);
    expect(WITHOUT_ABRAXAS_INDUSTRIES.map((i) => i.id)).toEqual(WITH_ABRAXAS_INDUSTRIES.map((i) => i.id));
  });

  it("includes regulated industry pillars", () => {
    expect(REGULATED_INDUSTRY_PILLARS.map((p) => p.title)).toEqual([
      "Age-gated commerce",
      "Gaming and wagering",
      "Financial applications",
      "Tokenized real-world assets",
      "Digital marketplaces",
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

  it("uses product-centric good trouble proof line", () => {
    expect(PROTOCOL_IN_ACTION_PROOFS[2]?.demonstrates).toBe(GOOD_TROUBLE_PROOF_LINE);
  });

  it("attaches audited imagery to protocol proof cards", () => {
    for (const proof of PROTOCOL_IN_ACTION_PROOFS) {
      expect(proof.image.src).toMatch(/^\/assets\//);
      expect(proof.image.alt.length).toBeGreaterThan(4);
    }
  });
});
