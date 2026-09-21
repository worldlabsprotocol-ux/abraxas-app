// FILE: lib/design/publicSurface.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { PUBLIC_NAV_LINKS } from "./publicSurface";

const ROOT = resolve(__dirname, "../..");

describe("public surface tokens", () => {
  it("exposes every public product surface in primary navigation", () => {
    expect(PUBLIC_NAV_LINKS.map((link) => link.label)).toEqual([
      "Home",
      "Passport",
      "Build",
    ]);
    const hrefs = PUBLIC_NAV_LINKS.map((link) => link.href);
    expect(hrefs).toContain("/passport");
    expect(hrefs).not.toContain("/judge-demo");
  });

  it("uses shared nav links in RedesignNav", () => {
    const nav = readFileSync(resolve(ROOT, "components/redesign/RedesignNav.tsx"), "utf8");
    expect(nav).toContain("PUBLIC_NAV_LINKS");
    expect(nav).not.toContain("NAV_PARTNER_VERIFY_LABEL");
  });
});
