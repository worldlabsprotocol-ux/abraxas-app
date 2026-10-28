// FILE: lib/home/institutionalTrustPositioning.test.ts

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  AUTHENTICITY_VS_AUTHORITY,
  INSTITUTIONAL_CAPABILITY_GAPS,
  INSTITUTIONAL_FOUR_ENGINES,
  INSTITUTIONAL_TRUST_CLOSURE,
  INSTITUTIONAL_TRUST_LEAD,
  INSTITUTIONAL_TRUST_THESIS,
} from "./institutionalTrustPositioning";
import { PROTOCOL_HERO_LEAD, PROTOCOL_HERO_TITLE } from "./protocolPositioningCopy";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("institutional trust positioning", () => {
  it("states continuous trust thesis and authority distinction", () => {
    expect(INSTITUTIONAL_TRUST_THESIS).toBe("Trust is continuous.");
    expect(INSTITUTIONAL_TRUST_LEAD).toMatch(/policy-bound trust decisions/i);
    expect(INSTITUTIONAL_TRUST_LEAD).toMatch(/authoritative evidence/i);
    expect(AUTHENTICITY_VS_AUTHORITY).toMatch(/valid signature proves authenticity/i);
    expect(INSTITUTIONAL_TRUST_CLOSURE).toMatch(/does not replace institutional control/i);
  });

  it("maps four engines with authority and continuity explicit", () => {
    expect(INSTITUTIONAL_FOUR_ENGINES.map((e) => e.id)).toEqual(["evidence", "proof", "authority", "continuity"]);
    expect(INSTITUTIONAL_FOUR_ENGINES.find((e) => e.id === "authority")?.title).toBe("Authority");
  });

  it("does not imply custody vendor partnerships in public positioning modules", () => {
    const publicCopy = [
      read("lib/home/protocolPositioningCopy.ts"),
      read("lib/home/cinematicHomeCopy.ts"),
      read("lib/integrate/businessPageCopy.ts"),
    ].join("\n");
    expect(publicCopy).not.toMatch(/\bUtila\b/i);
    expect(publicCopy).not.toMatch(/existing partnership/i);
    expect(publicCopy).not.toMatch(/certified integration with/i);
  });

  it("aligns protocol hero copy with institutional thesis", () => {
    expect(PROTOCOL_HERO_TITLE).toContain(INSTITUTIONAL_TRUST_THESIS.replace(".", ""));
    expect(PROTOCOL_HERO_LEAD).toBe(INSTITUTIONAL_TRUST_LEAD);
  });

  it("documents honest capability gaps", () => {
    expect(INSTITUTIONAL_CAPABILITY_GAPS.some((g) => /wallet signature alone/i.test(g))).toBe(true);
    expect(INSTITUTIONAL_CAPABILITY_GAPS.some((g) => /not implied/i.test(g))).toBe(true);
  });
});
