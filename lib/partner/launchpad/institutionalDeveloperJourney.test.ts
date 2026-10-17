// FILE: lib/partner/launchpad/institutionalDeveloperJourney.test.ts

import { describe, expect, it } from "vitest";
import {
  INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS,
  INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION,
} from "@/lib/partner/launchpad/institutionalDeveloperJourney";

describe("institutionalDeveloperJourney", () => {
  it("defines six task-based steps in order", () => {
    expect(INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION).toBe("593.v1");
    expect(INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS).toHaveLength(6);
    expect(INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS[1]?.id).toBe("choose_verification");
    expect(INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS[1]?.title).toMatch(/Choose verification/i);
  });
});
