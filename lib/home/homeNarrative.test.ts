import { describe, expect, it } from "vitest";
import { HOME_PROTOCOL_STEPS, HOME_CURRENT_MILESTONES } from "./homeNarrative";

describe("homeNarrative", () => {
  it("defines five protocol steps for how it works", () => {
    expect(HOME_PROTOCOL_STEPS).toHaveLength(5);
    expect(HOME_PROTOCOL_STEPS[4]?.label).toContain("Trust Decision");
  });

  it("uses public milestone language without internal jargon", () => {
    const joined = HOME_CURRENT_MILESTONES.join(" ").toLowerCase();
    expect(joined).not.toContain("iat");
    expect(joined).not.toContain("p1");
    expect(joined).toContain("production validation");
  });
});
