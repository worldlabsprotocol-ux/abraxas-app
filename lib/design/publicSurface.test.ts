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

  it("mounts Solana WalletProvider once at the application root", () => {
    const providers = readFileSync(resolve(ROOT, "components/providers/AppProviders.tsx"), "utf8");
    expect(providers).toContain("WalletContextProvider");
    const layout = readFileSync(resolve(ROOT, "app/layout.tsx"), "utf8");
    expect(layout).toContain("AppProviders");
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
