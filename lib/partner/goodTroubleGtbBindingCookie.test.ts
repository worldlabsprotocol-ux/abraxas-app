// FILE: lib/partner/goodTroubleGtbBindingCookie.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  buildGoodTroubleBrowseCallbackUrlWithGtb,
  readGoodTroubleGtbBindingReturnUrl,
  signGoodTroubleGtbBindingCookie,
  verifyGoodTroubleGtbBindingCookie,
} from "@/lib/partner/goodTroubleGtbBindingCookie";

const FLOW = `gtb_${"b".repeat(64)}`;
const VERIFY_REQUEST = "vr_seeker_browse_binding";

describe("goodTroubleGtbBindingCookie", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-gtb-binding-secret";
  });

  it("round-trips signed binding for verify_request", async () => {
    const token = await signGoodTroubleGtbBindingCookie({
      verifyRequestId: VERIFY_REQUEST,
      flowToken: FLOW,
    });
    expect(token).toBeTruthy();
    const payload = await verifyGoodTroubleGtbBindingCookie(token!);
    expect(payload).toEqual({ verifyRequestId: VERIFY_REQUEST, flowToken: FLOW });
  });

  it("reads binding return URL from request cookie", async () => {
    const token = await signGoodTroubleGtbBindingCookie({
      verifyRequestId: VERIFY_REQUEST,
      flowToken: FLOW,
    });
    const req = new NextRequest("http://localhost/partner/continue", {
      headers: { cookie: `abraxas_good_trouble_gtb_binding=${token}` },
    });
    const url = await readGoodTroubleGtbBindingReturnUrl(req, VERIFY_REQUEST);
    expect(url).toBe(buildGoodTroubleBrowseCallbackUrlWithGtb(FLOW));
    expect(url).toContain("gtb=");
    expect(url).toContain("rc=test-site");
  });

  it("rejects binding when verify_request mismatches", async () => {
    const token = await signGoodTroubleGtbBindingCookie({
      verifyRequestId: VERIFY_REQUEST,
      flowToken: FLOW,
    });
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `abraxas_good_trouble_gtb_binding=${token}` },
    });
    const url = await readGoodTroubleGtbBindingReturnUrl(req, "vr_other");
    expect(url).toBeNull();
  });

  it("rejects purchase gtf tokens", async () => {
    const token = await signGoodTroubleGtbBindingCookie({
      verifyRequestId: VERIFY_REQUEST,
      flowToken: `gtf_${"a".repeat(64)}`,
    });
    expect(token).toBeNull();
  });
});
