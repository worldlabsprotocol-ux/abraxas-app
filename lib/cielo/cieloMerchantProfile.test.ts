import { describe, expect, it } from "vitest";
import {
  CIELO_DEMO_SUPABASE_PROJECT_REF,
  getCieloMerchantCanonicalConfig,
} from "@/lib/cielo/cieloMerchantProfile";
import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { CIELO_V1_DISCLOSED_RESULT } from "@/lib/cielo/cieloVerifiedGuestPolicyContract";

describe("Cielo merchant canonical config", () => {
  it("uses cielo-verified-guest-v1 and pilot disclosure (not age_eligible_21)", () => {
    const cfg = getCieloMerchantCanonicalConfig();
    expect(cfg.partner_id).toBe("cielo");
    expect(cfg.policy_id).toBe(CIELO_VERIFIED_GUEST_POLICY_ID);
    expect(cfg.policy_pack_template).toBeNull();
    expect(cfg.disclosed_result).toBe(CIELO_V1_DISCLOSED_RESULT);
    expect(cfg.integration_mode).toBe("first_party_adapter");
    expect(CIELO_DEMO_SUPABASE_PROJECT_REF).toBe("ocntwbxarpjeixdnzide");
  });
});
