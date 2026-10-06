// FILE: lib/motion/abxMotionFramer.test.ts

import { describe, expect, it } from "vitest";
import {
  abxMotionTransition,
  abxStaggerDelay,
  abxRevealDistance,
} from "./abxMotionFramer";
import { ABX_MOTION } from "@/lib/design/abraxasMotion";

describe("abxMotionFramer", () => {
  it("bridges semantic roles to Framer transitions", () => {
    const t = abxMotionTransition("reveal");
    expect(t.duration).toBe(ABX_MOTION.reveal.durationMs / 1000);
    expect(t.ease).toEqual([0.16, 1, 0.3, 1]);
  });

  it("scales calm tier durations", () => {
    const t = abxMotionTransition("surface", { tier: "calm" });
    expect(t.duration).toBeCloseTo((ABX_MOTION.surface.durationMs / 1000) * 0.85);
  });

  it("exposes stagger and reveal distance tokens", () => {
    expect(abxStaggerDelay(2)).toBe(0.12);
    expect(abxRevealDistance()).toBe(18);
  });
});
