import { describe, expect, it } from "vitest";
import { buildCanonicalReplayKey } from "./replayKey";

describe("build548 canonical replay key", () => {
  it("ignores request_id — same scope yields identical replay key", () => {
    const scope = { partnerId: "p1", policyId: "pol1", receiptId: "dr_1" };
    expect(buildCanonicalReplayKey(scope)).toBe(buildCanonicalReplayKey(scope));
  });

  it("separates partner, policy, and receipt dimensions", () => {
    const base = { partnerId: "p1", policyId: "pol1", receiptId: "dr_1" };
    expect(buildCanonicalReplayKey({ ...base, policyId: "pol2" })).not.toBe(
      buildCanonicalReplayKey(base),
    );
    expect(buildCanonicalReplayKey({ ...base, partnerId: "p2" })).not.toBe(
      buildCanonicalReplayKey(base),
    );
    expect(buildCanonicalReplayKey({ ...base, receiptId: "dr_2" })).not.toBe(
      buildCanonicalReplayKey(base),
    );
  });
});
