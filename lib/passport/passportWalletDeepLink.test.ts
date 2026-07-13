import { describe, expect, it } from "vitest";
import { passportWalletAddHref } from "./passportWalletDeepLink";

describe("passportWalletAddHref", () => {
  it("includes tab and encoded return path", () => {
    const href = passportWalletAddHref("/connect/authorize?request=abc");
    expect(href).toContain("tab=wallets");
    expect(href).toContain("return=");
  });
});
