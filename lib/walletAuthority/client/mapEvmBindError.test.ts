import { describe, expect, it } from "vitest";
import { mapEvmBindError } from "./mapEvmBindError";

describe("mapEvmBindError", () => {
  it("maps isAddress bundling errors to plain copy", () => {
    expect(mapEvmBindError("(0 , c.isAddress) is not a function")).toContain("Sui wallet still works");
  });
});
