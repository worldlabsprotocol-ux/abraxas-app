import { describe, expect, it } from "vitest";
import {
  SIMPLIFIED_HOME_CTA_PRIMARY,
  SIMPLIFIED_HOME_CTA_PRIMARY_HREF,
  SIMPLIFIED_HERO_FLOW,
} from "./simplifiedHomeCopy";

describe("homepage demo entry", () => {
  it("sends the primary homepage action directly to the Passport Requests demo", () => {
    expect(SIMPLIFIED_HOME_CTA_PRIMARY).toBe("Try the Passport demo");
    expect(SIMPLIFIED_HOME_CTA_PRIMARY_HREF).toBe("/passport?view=requests");
  });

  it("describes the same three steps the holder completes", () => {
    expect(SIMPLIFIED_HERO_FLOW).toEqual([
      "Create request",
      "Review result",
      "Approve or decline",
    ]);
  });
});
