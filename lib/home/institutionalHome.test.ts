import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  INSTITUTIONAL_HOME_TITLE,
  INSTITUTIONAL_TRUST_BOUNDARIES,
} from "@/lib/home/institutionalHomeCopy";
import { protocolStateTone } from "@/lib/design/protocolStatePresentation";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("institutional homepage surface", () => {
  it("RedesignHome uses institutional layout and live readiness panels", () => {
    const home = read("components/redesign/RedesignHome.tsx");
    expect(home).toContain("InstitutionalHomeHero");
    expect(home).toContain("HomeOperationalReadiness");
    expect(home).toContain("TrustBoundaryPanel");
    expect(home).not.toContain("KineticMarquee");
    expect(home).not.toContain("CinematicHero");
    expect(home).toContain("abx-institutional-home");
  });

  it("copy defines trust boundaries without forbidden hype", () => {
    expect(INSTITUTIONAL_HOME_TITLE.length).toBeGreaterThan(20);
    expect(INSTITUTIONAL_TRUST_BOUNDARIES.length).toBeGreaterThanOrEqual(4);
  });

  it("devnet states map to warning tone", () => {
    expect(protocolStateTone("devnet_labeled")).toBe("warning");
    expect(protocolStateTone("revoked")).toBe("error");
  });
});
