import { describe, expect, it } from "vitest";
import { createFrictionRecord, finalizeFrictionRecord, recordRouteEvent } from "./unifiedWorkspaceJourneyMetrics";

describe("unifiedWorkspaceJourneyMetrics", () => {
  it("counts route changes without inventing durations", () => {
    const record = createFrictionRecord("https://example.test");
    recordRouteEvent(record, { pathname: "/", search: "", hash: "", trigger: "load" });
    recordRouteEvent(record, {
      pathname: "/developers/ephemeral-sandbox",
      search: "",
      hash: "",
      trigger: "navigate",
    });
    const done = finalizeFrictionRecord(record);
    expect(done.route_change_count).toBe(1);
    expect(done.route_events).toHaveLength(2);
  });
});
