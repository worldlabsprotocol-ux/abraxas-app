// FILE: lib/sui/client.test.ts

import { describe, expect, it, afterEach, vi } from "vitest";
import { BrowserSuiRpcError, getSuiClient } from "./client";

describe("getSuiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws in the browser unless allowBrowser is set", () => {
    vi.stubGlobal("window", {});
    expect(() => getSuiClient()).toThrow(BrowserSuiRpcError);
    expect(() => getSuiClient({ allowBrowser: true })).not.toThrow();
  });
});
