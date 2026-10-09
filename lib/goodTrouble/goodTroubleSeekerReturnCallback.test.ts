// FILE: lib/goodTrouble/goodTroubleSeekerReturnCallback.test.ts
// Seeker/Wix purchase callback URL shape — gtv required; status=approved alone is insufficient.

import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_EXPECTED_CALLBACK_URL } from "@/lib/goodTrouble/canonicalProductionConfig";
import { extractGoodTroubleFlowToken } from "@/lib/partner/continuationReturnUrlMatch";

const FLOW_TOKEN = `gtf_${"f".repeat(64)}`;

describe("Good Trouble Seeker return callback shape", () => {
  it("matches live approved redirect params plus gtv", () => {
    const url = new URL(GOOD_TROUBLE_EXPECTED_CALLBACK_URL);
    url.searchParams.set("status", "approved");
    url.searchParams.set("decision_id", "vd_seeker_1");
    url.searchParams.set("receipt_id", "dr_seeker_1");
    url.searchParams.set("policy_id", "good-trouble-age_21_retail-v1");
    url.searchParams.set("partner_id", "good-trouble-cannabis");
    url.searchParams.set("receipt_expires_at", new Date(Date.now() + 3600000).toISOString());
    url.searchParams.set("gtv", FLOW_TOKEN);

    expect(extractGoodTroubleFlowToken(url.toString())).toBe(FLOW_TOKEN);
    expect(url.searchParams.get("status")).toBe("approved");
  });

  it("status=approved without gtv is not a complete Wix PKCE callback", () => {
    const url = new URL(GOOD_TROUBLE_EXPECTED_CALLBACK_URL);
    url.searchParams.set("status", "approved");
    url.searchParams.set("receipt_id", "dr_seeker_1");
    expect(extractGoodTroubleFlowToken(url.toString())).toBeNull();
  });
});
