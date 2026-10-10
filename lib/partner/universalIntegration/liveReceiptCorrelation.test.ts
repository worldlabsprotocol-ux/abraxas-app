import { describe, expect, it } from "vitest";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";
import { resolveLiveReceiptCorrelation } from "./liveReceiptCorrelation";

const config = {
  baseUrl: "https://staging.example",
  partnerId: "example-merchant-protocol",
  policyId: "example-merchant-age-21-v1",
  returnUrl: "https://app.example/cb",
  displayName: "Example",
};

describe("resolveLiveReceiptCorrelation", () => {
  it("resolves receipt from callback capture URL", () => {
    const url = "https://app.example/cb?receipt_id=dr_live_abc&partner_id=example-merchant-protocol&policy_id=example-merchant-age-21-v1&status=approved";
    const result = resolveLiveReceiptCorrelation({
      config,
      env: { EXAMPLE_MERCHANT_LIVE_CALLBACK_URL: url },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.correlation.receipt_id).toBe("dr_live_abc");
      expect(result.correlation.source).toBe("callback_url");
    }
  });

  it("rejects partner mismatch on callback", () => {
    const url = "https://app.example/cb?receipt_id=dr_x&partner_id=wrong&policy_id=example-merchant-age-21-v1";
    const result = resolveLiveReceiptCorrelation({
      config,
      env: { EXAMPLE_MERCHANT_LIVE_CALLBACK_URL: url },
    });
    expect(result.ok).toBe(false);
  });

  it("falls back to legacy receipt id env", () => {
    const result = resolveLiveReceiptCorrelation({
      config,
      env: { EXAMPLE_MERCHANT_LIVE_RECEIPT_ID: "dr_legacy_1" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.correlation.source).toBe("receipt_id_env");
  });
});
