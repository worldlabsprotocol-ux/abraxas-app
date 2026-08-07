import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/examples/x402-partner-flow-gateway/resource/route";

const completeEnv: Record<string, string> = {
  X402_REF_GATEWAY_ENABLED: "true",
  X402_REF_PARTNER_ID: "pilot-partner",
  X402_REF_POLICY_ID: "pilot-policy-v1",
  X402_REF_ABRAXAS_BASE_URL: "https://abraxas.example",
  X402_REF_FACILITATOR_URL: "https://facilitator.example",
  X402_REF_PAY_TO: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  X402_REF_RESOURCE_URL: "https://partner.example/resource",
};

describe("x402 partner flow gateway route safety", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 404 when gateway is disabled by default", async () => {
    delete process.env.X402_REF_GATEWAY_ENABLED;
    const res = await GET(new NextRequest("http://localhost/api/examples/x402-partner-flow-gateway/resource"));
    expect(res.status).toBe(404);
  });

  it("rejects serverless/Vercel deployment entirely (fail closed)", async () => {
    Object.assign(process.env, completeEnv, { VERCEL: "1" });
    const res = await GET(new NextRequest("http://localhost/api/examples/x402-partner-flow-gateway/resource?receipt_id=dr_test"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("gateway_runtime_blocked");
    expect(body.reason).toBe("serverless_file_store_rejected");
  });

  it("blocks settlement without durable store on remote hosts", async () => {
    Object.assign(process.env, completeEnv);
    const res = await GET(new NextRequest(
      "http://localhost/api/examples/x402-partner-flow-gateway/resource?receipt_id=dr_test",
      { headers: { "PAYMENT-SIGNATURE": "dGVzdA==" } },
    ));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("settlement_unavailable");
    expect(body.reason).toBe("durable_fulfillment_store_required");
  });

  it("rejects invalid operator config at startup", async () => {
    Object.assign(process.env, completeEnv, {
      X402_REF_PAY_TO: "not-an-address",
    });
    const res = await GET(new NextRequest("http://localhost/api/examples/x402-partner-flow-gateway/resource"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("gateway_invalid_config");
    expect(body.validation_errors).toContain("pay_to_must_be_valid_evm_address");
  });
});
