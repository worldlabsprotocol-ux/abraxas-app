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
  it("RedesignHome uses editorial hero, trust exhibit, and capability matrix", () => {
    const home = read("components/redesign/RedesignHome.tsx");
    expect(home).toContain("InstitutionalHomeHero");
    expect(home).toContain("TrustModelExhibit");
    expect(home).toContain("LiveProtocolEvidence");
    expect(home).toContain("CapabilityMatrix");
    expect(home).not.toContain("KineticMarquee");
    expect(home).not.toContain("CinematicHero");
    expect(home).not.toContain("HomeOperationalReadiness");
    expect(home).toContain("abx-v2-shell");
  });

  it("hero includes interactive receipt demo", () => {
    const hero = read("components/institutional/InstitutionalHomeHero.tsx");
    expect(hero).toContain("ProtocolReceiptDemo");
    expect(V2_HOME_HEADLINE).toContain("Trust");
    expect(TRUST_MODEL_STAGES.length).toBe(4);
  });

  it("devnet states map to warning tone", () => {
    expect(protocolStateTone("devnet_labeled")).toBe("warning");
    expect(protocolStateTone("revoked")).toBe("error");
  });
});
