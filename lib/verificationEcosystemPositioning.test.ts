import { describe, expect, it } from "vitest";
import {
  REPEATED_VERIFICATION_INDUSTRIES,
  VERIFICATION_VERTICAL_TABLE,
} from "./verificationEcosystemPositioning";

describe("verificationEcosystemPositioning", () => {
  it("includes Good Trouble cannabis row", () => {
    const cannabis = VERIFICATION_VERTICAL_TABLE.find(r => r.vertical.includes("Cannabis"));
    expect(cannabis?.partnerToday).toContain("Good Trouble");
    expect(cannabis?.status).toBe("pilot");
  });

  it("covers multiple repeated-verification industries", () => {
    const ids = REPEATED_VERIFICATION_INDUSTRIES.map(i => i.id);
    expect(ids).toContain("cannabis");
    expect(ids).toContain("crypto");
    expect(ids).toContain("igaming");
    expect(REPEATED_VERIFICATION_INDUSTRIES.length).toBeGreaterThanOrEqual(8);
  });
});
