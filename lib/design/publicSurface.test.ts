// FILE: lib/design/publicSurface.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { PUBLIC_NAV_LINKS, PUBLIC_NAV_MENUS, PUBLIC_NAV_START_BUILDING } from "./publicSurface";

const ROOT = resolve(__dirname, "../..");

describe("public surface tokens", () => {
  it("exposes primary destinations in top navigation menus", () => {
    const labels = PUBLIC_NAV_MENUS.flatMap((g) => g.links.map((l) => l.label));
    expect(labels).toContain("Public demo");
    expect(labels).toContain("Documentation");
    expect(labels).toContain("Independent verifier");
    expect(PUBLIC_NAV_START_BUILDING.href).toBe("/#start-sandbox");
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
    expect(nav).toContain("PublicNavPrimaryActionLink");
    expect(nav).not.toContain("PublicNavLaunchAppLink");
    expect(nav).toContain("PublicNavSectionMenu");
    expect(nav).toContain("PUBLIC_NAV_MENUS");
    expect(nav).toContain("LanguageSelector");
    expect(nav).not.toContain("NavSignInButton");
    expect(nav).not.toContain("PublicNavWalletButton");
    expect(nav).not.toContain("PublicNavExploreLink");
    expect(nav).not.toContain("rd-nav-links");
  });
});
