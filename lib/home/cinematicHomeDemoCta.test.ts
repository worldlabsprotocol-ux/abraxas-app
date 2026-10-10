import { describe, expect, it } from "vitest";
import {
  CINEMATIC_CTA_DEMO,
  CINEMATIC_CTA_DEMO_HREF,
} from "@/lib/home/cinematicHomeCopy";

describe("cinematic homepage demo CTA (Build #513)", () => {
  it("points to simulated tour without auth", () => {
    expect(CINEMATIC_CTA_DEMO).toBe("Explore the demo");
    expect(CINEMATIC_CTA_DEMO_HREF).toBe("/experience/tour");
  });
});
