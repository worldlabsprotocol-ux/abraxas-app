// FILE: lib/passport/holderPossessionKeyBrowserStorage.test.ts
// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  loadHolderPossessionKeyMaterial,
  setPossessionRememberDevice,
  storeHolderPossessionKeyMaterial,
} from "./holderPossessionKeyBrowserStorage";

describe("holderPossessionKeyBrowserStorage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    setPossessionRememberDevice(false);
  });

  it("stores and reloads possession material from session storage", async () => {
    await storeHolderPossessionKeyMaterial({
      secretKeyB64Url: "secret",
      publicKeyB64Url: "public",
      rememberOnDevice: false,
    });
    const loaded = await loadHolderPossessionKeyMaterial();
    expect(loaded?.secretKeyB64Url).toBe("secret");
    expect(loaded?.source).toBe("session");
  });
});
