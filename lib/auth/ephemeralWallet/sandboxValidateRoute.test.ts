// FILE: lib/auth/ephemeralWallet/sandboxValidateRoute.test.ts
// Build 890 — sandbox receipt validate POST contract.

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { issueEphemeralSandboxTestResult, storeEphemeralSandboxTestResult } from "./sandboxTestVerification";
import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";
import { buildSandboxReceiptValidateRequestBody } from "./sandboxValidateClientRequest";
import { POST } from "@/app/api/auth/wallet/sandbox/validate/route";

describe("sandbox validate POST route contract", () => {
  it("validates stored receipt via canonical body", async () => {
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    expect(policy).toBeTruthy();
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_route",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    await storeEphemeralSandboxTestResult(receipt);
    const res = await POST(
      new NextRequest("http://localhost/api/auth/wallet/sandbox/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildSandboxReceiptValidateRequestBody(receipt)),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signature_authentic).toBe(true);
  });

  it("rejects unknown_field on POST body", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/auth/wallet/sandbox/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receipt: {}, partner_id: "evil" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("unknown_field");
  });

  it("rejects invalid receipt shape", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/auth/wallet/sandbox/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildSandboxReceiptValidateRequestBody({ not_a_receipt: true })),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("invalid_receipt");
  });
});
