// FILE: lib/home/trustArchitectureStages.test.ts

import { describe, expect, it } from "vitest";
import { TRUST_ARCHITECTURE_STAGES } from "./trustArchitectureStages";

describe("trust architecture stages", () => {
  it("defines four numbered stages with continuity copy", () => {
    expect(TRUST_ARCHITECTURE_STAGES).toHaveLength(4);
    expect(TRUST_ARCHITECTURE_STAGES.map((s) => s.index)).toEqual(["01", "02", "03", "04"]);
    expect(TRUST_ARCHITECTURE_STAGES[1]?.title).toMatch(/Abraxas decision/i);
    expect(TRUST_ARCHITECTURE_STAGES.every((s) => s.continuity.length > 10)).toBe(true);
  });
});
