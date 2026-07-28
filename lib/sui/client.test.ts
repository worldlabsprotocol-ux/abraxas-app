// FILE: lib/sui/client.test.ts

import { describe, expect, it, afterEach, vi } from "vitest";
import { BrowserSuiRpcError, getSuiClient } from "./client";

describe("getSuiClient (browser)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("always throws in the browser", () => {
    vi.stubGlobal("window", {});
    expect(() => getSuiClient()).toThrow(BrowserSuiRpcError);
  });
});
