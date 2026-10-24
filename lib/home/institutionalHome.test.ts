import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { V2_HOME_HEADLINE } from "@/lib/home/v2HomeCopy";
import { TRUST_MODEL_STAGES } from "@/lib/home/trustModelStages";
import { protocolStateTone } from "@/lib/design/protocolStatePresentation";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("institutional homepage surface (V2)", () => {
  it("RedesignHome uses premium hero, sandbox entry, consolidated how-it-works, and build", () => {
    const home = read("components/redesign/RedesignHome.tsx");
    const unified = read("components/home/HomeUnifiedProductEntry.tsx");
    const page = read("app/page.tsx");
    expect(page).toContain("PremiumHomeHero");
    expect(home).toContain("HomeUnifiedProductEntry");
    expect(unified).toContain("HomeNativeSandboxChapter");
    expect(unified).toContain("HomeHowAbraxasWorksSection");
    expect(unified).toContain("HomeBuildEntrySection");
    expect(home).not.toContain("KineticMarquee");
    expect(home).not.toContain("CinematicHero");
    expect(home).toContain("abx-v2-shell");
  });

  it("trust model documents four boundaries including portable trust", () => {
    expect(V2_HOME_HEADLINE).toMatch(/holder-controlled|Trust/i);
    expect(TRUST_MODEL_STAGES.length).toBe(4);
    expect(TRUST_MODEL_STAGES[3]?.title).toBe("Independent verification");
  });

  it("devnet states map to warning tone", () => {
    expect(protocolStateTone("devnet_labeled")).toBe("warning");
    expect(protocolStateTone("revoked")).toBe("error");
  });
});
