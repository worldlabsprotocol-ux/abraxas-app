// FILE: lib/partner/goodTroubleGtvBindingCookie.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  buildGoodTroublePurchaseCallbackUrlWithGtv,
  readGoodTroubleGtvBindingReturnUrl,
  signGoodTroubleGtvBindingCookie,
  verifyGoodTroubleGtvBindingCookie,
} from "@/lib/partner/goodTroubleGtvBindingCookie";

const FLOW = `gtf_${"c".repeat(64)}`;
const VERIFY_REQUEST = "vr_seeker_binding_test";

describe("goodTroubleGtvBindingCookie", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-gtv-binding-secret";
  });

  it("round-trips signed binding for verify_request", async () => {
    const token = await signGoodTroubleGtvBindingCookie({
      verifyRequestId: VERIFY_REQUEST,
      flowToken: FLOW,
    });
    expect(token).toBeTruthy();
    const payload = await verifyGoodTroubleGtvBindingCookie(token!);
    expect(payload).toEqual({ verifyRequestId: VERIFY_REQUEST, flowToken: FLOW });
  });

  it("reads binding return URL from request cookie", async () => {
    const token = await signGoodTroubleGtvBindingCookie({
      verifyRequestId: VERIFY_REQUEST,
      flowToken: FLOW,
    });
    const req = new NextRequest("http://localhost/api/v1/partner-flow/purchase-return", {
      headers: { cookie: `abraxas_good_trouble_gtv_binding=${token}` },
    });
    const url = await readGoodTroubleGtvBindingReturnUrl(req, VERIFY_REQUEST);
    expect(url).toBe(buildGoodTroublePurchaseCallbackUrlWithGtv(FLOW));
  });

  it("rejects binding when verify_request mismatches", async () => {
    const token = await signGoodTroubleGtvBindingCookie({
      verifyRequestId: VERIFY_REQUEST,
      flowToken: FLOW,
    });
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `abraxas_good_trouble_gtv_binding=${token}` },
    });
    const url = await readGoodTroubleGtvBindingReturnUrl(req, "vr_other");
    expect(url).toBeNull();
  });
});
