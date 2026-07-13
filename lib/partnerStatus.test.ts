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
    const sub = partnerDisplaySubtitle(REAL_PARTNERS[1]!);
    expect(sub).toContain("Tribal land");
  });
});
