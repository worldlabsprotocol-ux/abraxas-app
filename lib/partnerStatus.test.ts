// FILE: lib/partnerStatus.test.ts

import { describe, expect, it } from "vitest";
import {
  PARTNER_NAME_PLACEHOLDER,
  REAL_PARTNERS,
  partnerDisplayName,
  partnerDisplaySubtitle,
} from "./partnerStatus";

describe("partnerDisplayName", () => {
  it("never returns bracket placeholder", () => {
    for (const p of REAL_PARTNERS) {
      expect(partnerDisplayName(p)).not.toContain("[");
      expect(partnerDisplayName(p)).not.toBe(PARTNER_NAME_PLACEHOLDER);
    }
  });

  it("uses vertical headline when name not approved", () => {
    const p = REAL_PARTNERS[0]!;
    expect(partnerDisplayName(p)).toBe(p.verticalHeadline);
  });

  it("includes vertical in subtitle when name hidden", () => {
    const sub = partnerDisplaySubtitle(REAL_PARTNERS[2]!);
    expect(sub).toContain("Tribal land");
    expect(sub).toContain("active on Abraxas");
  });

  it("uses vertical headline for Oklahoma land partner", () => {
    const land = REAL_PARTNERS.find(p => p.id === "relying-party-land-ok-1");
    expect(land).toBeDefined();
    expect(partnerDisplayName(land!)).toBe(land!.verticalHeadline);
  });
});
