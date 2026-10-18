import { describe, expect, it } from "vitest";
import { NativeAccountStoreUnavailableError } from "@/lib/auth/nativeAccount/store";
import { mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";

describe("provider outage — native auth fail closed", () => {
  it("maps store unavailable to 503", async () => {
    const res = mapNativeStoreError(new NativeAccountStoreUnavailableError());
    expect(res?.status).toBe(503);
    const body = (await res!.json()) as { code?: string };
    expect(body.code).toBe("native_account_store_unavailable");
  });
});

describe("provider outage — independent verifier distinguishes crypto vs live authority", () => {
  it("never marks currently_authorizable when revocation source unavailable", () => {
    const result = verifyReceiptIndependently({
      expectations: { partnerId: "ptr_x", policyId: "pol_x" },
      revocationSource: { available: false, reason: "unavailable" },
    });
    expect(result.currently_authorizable).toBe(false);
    expect(result.checks_requiring_live_authority.length).toBeGreaterThan(0);
    expect(result.disclaimer.length).toBeGreaterThan(10);
  });
});
