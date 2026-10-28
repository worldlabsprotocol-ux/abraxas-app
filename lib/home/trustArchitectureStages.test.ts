// FILE: lib/home/trustArchitectureStages.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  TRUST_ARCHITECTURE_OVERVIEW,
  TRUST_ARCHITECTURE_STAGES,
} from "./trustArchitectureStages";

describe("trust architecture stages", () => {
  it("defines four numbered stages with panel points and continuity copy", () => {
    expect(TRUST_ARCHITECTURE_STAGES).toHaveLength(4);
    expect(TRUST_ARCHITECTURE_STAGES.map((s) => s.index)).toEqual(["01", "02", "03", "04"]);
    expect(TRUST_ARCHITECTURE_STAGES[1]?.title).toMatch(/Abraxas decision/i);
    expect(TRUST_ARCHITECTURE_STAGES.every((s) => s.continuity.length > 10)).toBe(true);
    expect(TRUST_ARCHITECTURE_STAGES.every((s) => s.panelPoints.length >= 4)).toBe(true);
    expect(TRUST_ARCHITECTURE_STAGES[3]?.panelPoints).toContain("Permit");
    expect(TRUST_ARCHITECTURE_STAGES[3]?.continuity).toMatch(/Reevaluation is a continuity operation/i);
  });

  it("maps each stage to a distinct public visual asset", () => {
    const root = path.join(process.cwd(), "public");
    const srcs = TRUST_ARCHITECTURE_STAGES.map((s) => s.visualSrc);
    expect(new Set(srcs).size).toBe(4);
    for (const src of srcs) {
      expect(fs.existsSync(path.join(root, src.replace(/^\//, "")))).toBe(true);
    }
    expect(fs.existsSync(path.join(root, TRUST_ARCHITECTURE_OVERVIEW.src.replace(/^\//, "")))).toBe(true);
  });
});
