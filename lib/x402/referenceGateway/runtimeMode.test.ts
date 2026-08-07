import { describe, expect, it } from "vitest";
import {
  assessReferenceGatewayRuntime,
  isLocalDemoMode,
  isServerlessOrVercel,
} from "./runtimeMode";

describe("runtimeMode", () => {
  it("detects serverless and Vercel environments", () => {
    expect(isServerlessOrVercel({ VERCEL: "1" })).toBe(true);
    expect(isServerlessOrVercel({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isServerlessOrVercel({ AWS_LAMBDA_FUNCTION_NAME: "fn" })).toBe(true);
    expect(isServerlessOrVercel({})).toBe(false);
  });

  it("requires explicit local-demo mode flag", () => {
    expect(isLocalDemoMode({ X402_REF_LOCAL_DEMO_MODE: "true" })).toBe(true);
    expect(isLocalDemoMode({ X402_REF_LOCAL_DEMO_MODE: "false" })).toBe(false);
    expect(isLocalDemoMode({})).toBe(false);
  });

  it("rejects serverless/Vercel entirely (fail closed)", () => {
    const assessment = assessReferenceGatewayRuntime({
      VERCEL: "1",
      X402_REF_LOCAL_DEMO_MODE: "true",
    });
    expect(assessment.routeAllowed).toBe(false);
    expect(assessment.settlementAllowed).toBe(false);
    expect(assessment.reason).toBe("serverless_file_store_rejected");
  });

  it("allows local-demo file store only on non-serverless hosts", () => {
    const assessment = assessReferenceGatewayRuntime({
      X402_REF_LOCAL_DEMO_MODE: "true",
    });
    expect(assessment.routeAllowed).toBe(true);
    expect(assessment.settlementAllowed).toBe(true);
    expect(assessment.storeKind).toBe("file-local-demo");
    expect(assessment.createFulfillmentStore).toBeTypeOf("function");
  });

  it("blocks settlement without durable adapter on remote hosts", () => {
    const assessment = assessReferenceGatewayRuntime({});
    expect(assessment.routeAllowed).toBe(true);
    expect(assessment.settlementAllowed).toBe(false);
    expect(assessment.reason).toBe("durable_fulfillment_store_required");
    expect(assessment.createFulfillmentStore).toBeUndefined();
  });

  it("does not implement durable adapter even when env is set", () => {
    const assessment = assessReferenceGatewayRuntime({
      X402_REF_DURABLE_STORE_ADAPTER: "postgres",
    });
    expect(assessment.settlementAllowed).toBe(false);
    expect(assessment.reason).toBe("durable_fulfillment_store_not_implemented");
  });
});
