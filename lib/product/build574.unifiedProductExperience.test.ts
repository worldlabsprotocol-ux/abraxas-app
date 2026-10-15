// FILE: lib/product/build574.unifiedProductExperience.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CINEMATIC_HOME_CTA_PRIMARY,
  CINEMATIC_HOME_CTA_PRIMARY_HREF,
} from "@/lib/home/cinematicHomeCopy";
import { PUBLIC_JOURNEY_SURFACES } from "@/lib/product/publicJourneyManifest";
import { PUBLIC_NAV_LINKS, PUBLIC_NAV_PRIMARY_CTA } from "@/lib/design/publicSurface";
import { resolveHolderFacingApiOrigin } from "@/lib/product/canonicalProductOrigin";

const ROOT = process.cwd();

const HOLDER_JOURNEY_FILES = [
  "app/try/TryAbraxasClient.tsx",
  "components/passport/PassportGate.tsx",
  "components/partner/SolanaDevnetProofClient.tsx",
  "components/partner/launchpad/HostedHandoffControls.tsx",
  "components/redesign/RedesignHome.tsx",
  "components/home/premium/PremiumHomeHero.tsx",
] as const;

describe("Build #574 unified Passport product experience", () => {
  it("routes homepage primary CTA and nav Launch App to Passport on the same origin", () => {
    expect(CINEMATIC_HOME_CTA_PRIMARY).toMatch(/Passport/i);
    expect(CINEMATIC_HOME_CTA_PRIMARY_HREF).toBe("/passport");
    expect(PUBLIC_NAV_PRIMARY_CTA.href).toBe("/passport");
    expect(PUBLIC_NAV_LINKS.map((link) => link.label)).toContain("Passport");
    expect(PUBLIC_NAV_LINKS.some((link) => link.href === "/passport")).toBe(true);
  });

  it("declares abraxasworld.xyz as default holder API origin when unset", () => {
    expect(resolveHolderFacingApiOrigin({})).toBe("https://abraxasworld.xyz");
    expect(resolveHolderFacingApiOrigin({ NEXT_PUBLIC_APP_URL: "https://abraxasworld.xyz/" }))
      .toBe("https://abraxasworld.xyz");
  });

  it("does not hardcode demo.abraxasworld.xyz on holder journey surfaces", () => {
    for (const rel of HOLDER_JOURNEY_FILES) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src, rel).not.toContain("demo.abraxasworld.xyz");
    }
  });

  it("keeps public journey manifest homepage CTA on Passport", () => {
    const home = PUBLIC_JOURNEY_SURFACES.find((surface) => surface.route === "/");
    expect(home?.primaryCta.href).toBe("/passport");
  });
});
