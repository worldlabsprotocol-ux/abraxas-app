// FILE: lib/partner/build584/liveInstitutionalHttpJourney.test.ts

import { describe, expect, it } from "vitest";
import { runLiveInstitutionalHttpJourney } from "@/lib/partner/build584/liveInstitutionalHttpJourney";

describe("liveInstitutionalHttpJourney", () => {
  it("blocks without partner credentials", async () => {
    const steps = await runLiveInstitutionalHttpJourney({});
    expect(steps[0]?.status).toBe("blocked");
    expect(steps[0]?.step).toBe("partner_credentials");
  });
});
