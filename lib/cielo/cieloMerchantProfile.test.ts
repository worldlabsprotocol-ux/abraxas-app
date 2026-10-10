import { describe, expect, it } from "vitest";
import {
  CIELO_DEMO_SUPABASE_PROJECT_REF,
  getCieloMerchantCanonicalConfig,
} from "@/lib/cielo/cieloMerchantProfile";
import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/verifiedGuestPolicy";

describe("Cielo merchant canonical config", () => {
  it("uses cielo-verified-guest-v1 and age_eligible_21 disclosure alignment", () => {
    const cfg = getCieloMerchantCanonicalConfig();
    expect(cfg.partner_id).toBe("cielo");
    expect(cfg.policy_id).toBe(CIELO_VERIFIED_GUEST_POLICY_ID);
    expect(cfg.disclosed_result).toBe("age_eligible_21");
    expect(cfg.integration_mode).toBe("first_party_adapter");
    expect(CIELO_DEMO_SUPABASE_PROJECT_REF).toBe("ocntwbxarpjeixdnzide");
  });
});
