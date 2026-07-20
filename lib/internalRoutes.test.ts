// FILE: lib/internalRoutes.test.ts
import { describe, expect, it } from "vitest";
import { isInternalRoute } from "./internalRoutes";

describe("isInternalRoute", () => {
  it("flags strategy and outreach", () => {
    expect(isInternalRoute("/investors/strategy")).toBe(true);
    expect(isInternalRoute("/investors/updates")).toBe(true);
    expect(isInternalRoute("/integrations/outreach")).toBe(true);
  });

  it("allows public investor hub", () => {
    expect(isInternalRoute("/investors")).toBe(false);
    expect(isInternalRoute("/investors/pitch")).toBe(false);
  });
});
