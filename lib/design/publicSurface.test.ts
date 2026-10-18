// FILE: lib/design/publicSurface.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { PUBLIC_NAV_LINKS } from "./publicSurface";

const ROOT = resolve(__dirname, "../..");

describe("public surface tokens", () => {
  it("exposes every public product surface for secondary navigation", () => {
    expect(PUBLIC_NAV_LINKS.map((link) => link.label)).toEqual([
      "Home",
      "Passport",
      "Studio",
    ]);
    const hrefs = PUBLIC_NAV_LINKS.map((link) => link.href);
    expect(hrefs).toContain("/passport");
    expect(hrefs).not.toContain("/judge-demo");
  });

  it("uses consolidated primary header controls in RedesignNav", () => {
    const nav = readFileSync(resolve(ROOT, "components/redesign/RedesignNav.tsx"), "utf8");
    expect(nav).toContain("PublicNavConnectButton");
    expect(nav).toContain("PublicNavLaunchAppLink");
    expect(nav).toContain("LanguageSelector");
    expect(nav).not.toContain("NavSignInButton");
    expect(nav).not.toContain("PublicNavWalletButton");
    expect(nav).not.toContain("rd-nav-links");
  });
});
