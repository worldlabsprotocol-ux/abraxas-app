// FILE: lib/partner/goodTroubleBrowseReturnGtbBinding.integration.test.ts
// Seeker-like browse: HttpOnly gtb binding restores browse callback with gtb + rc.

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_BROWSE_RC_PARAM,
  GOOD_TROUBLE_GTB_PARAM,
} from "@/lib/partner/normalizePartnerVerifyInput";
import {
  buildGoodTroubleBrowseCallbackUrlWithGtb,
  signGoodTroubleGtbBindingCookie,
} from "@/lib/partner/goodTroubleGtbBindingCookie";
import { resolvePartnerReturnUrlHintForRequest } from "@/lib/partner/partnerReturnUrlHint";
import { mergePartnerReturnUrlHints } from "@/lib/partner/continuationReturnUrlMatch";

const GTB = `gtb_${"d".repeat(64)}`;
const BINDING_RETURN = buildGoodTroubleBrowseCallbackUrlWithGtb(GTB);
const BARE_BROWSE_CALLBACK = "https://www.goodtroublecanna.com/browse-verification-result";
const VERIFY_REQUEST_ID = "vr_gtb_binding_browse";

describe("Good Trouble browse gtb binding integration", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "browse-gtb-binding-integration";
  });

  it("mergePartnerReturnUrlHints upgrades bare browse callback from gtb hint", () => {
    const merged = mergePartnerReturnUrlHints(BARE_BROWSE_CALLBACK, BINDING_RETURN);
    const parsed = new URL(merged);
    expect(parsed.searchParams.get(GOOD_TROUBLE_GTB_PARAM)).toBe(GTB);
    expect(parsed.searchParams.get(GOOD_TROUBLE_BROWSE_RC_PARAM)).toBe("test-site");
  });

  it("resolvePartnerReturnUrlHintForRequest prefers gtb cookie over bare continuation", async () => {
    const token = await signGoodTroubleGtbBindingCookie({
      verifyRequestId: VERIFY_REQUEST_ID,
      flowToken: GTB,
    });
    const req = new NextRequest("http://localhost/partner/continue", {
      headers: { cookie: `abraxas_good_trouble_gtb_binding=${token}` },
    });
    const resolved = await resolvePartnerReturnUrlHintForRequest(
      req,
      BARE_BROWSE_CALLBACK,
      VERIFY_REQUEST_ID,
    );
    expect(resolved).toBe(BINDING_RETURN);
  });

  it("does not merge purchase gtv into browse callback", () => {
    const purchaseHint = `https://www.goodtroublecanna.com/age-verification-result?gtv=gtf_${"e".repeat(64)}`;
    const merged = mergePartnerReturnUrlHints(BARE_BROWSE_CALLBACK, purchaseHint);
    expect(merged).toBe(BARE_BROWSE_CALLBACK);
  });
});
