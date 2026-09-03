// FILE: lib/home/partnerProof.test.ts

import { describe, expect, it } from "vitest";
import { HOME_PARTNER_PROOF_FALLBACK, resolveHomePartnerProofCards } from "./partnerProof";

describe("partner proof cards", () => {
  it("uses fallback copy when no authorized partners are configured", () => {
    const cards = resolveHomePartnerProofCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe(HOME_PARTNER_PROOF_FALLBACK.title);
    expect(cards[0].badge).toBe(HOME_PARTNER_PROOF_FALLBACK.badge);
    expect(cards[0].journeyHref).toBe("/pilot-journey");
  });

  it("does not expose Good Trouble name without authorization", () => {
    const cards = resolveHomePartnerProofCards();
    expect(JSON.stringify(cards).toLowerCase()).not.toContain("good trouble");
  });
});
