// FILE: lib/sui/zklogin/holderPlatform.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNativeHolderRedirectUri } from "./holderPlatform";
import { ZKLOGIN_CALLBACK_PATH } from "./config";

describe("holderPlatform", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://abraxasworld.xyz";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("pins native redirect URI to canonical production host", () => {
    expect(getNativeHolderRedirectUri()).toBe(
      `https://abraxasworld.xyz${ZKLOGIN_CALLBACK_PATH}`,
    );
  });
});
