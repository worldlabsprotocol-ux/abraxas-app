// FILE: lib/partner/holderExperience/trustContract.test.ts
// Proves holder presentation layer does not alter protocol/trust contracts.

import { describe, expect, it } from "vitest";
import { POLICY_PACK_LIST, inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { buildPolicyPresentationFromPolicyId } from "@/lib/partner/launchpad/policyPresentation";
import { resolveDisclosureProfile } from "@/lib/privacy/selectiveDisclosure";
import { buildHolderRequestBrief } from "./brief";
import { buildHolderVerificationPresentation, humanizeHolderResult } from "./presentation";

describe("holder UX trust contract", () => {
  it("preserves disclosed_result and receipt_claim from policy packs", () => {
    for (const pack of POLICY_PACK_LIST) {
      const policyId = `demo-${pack.id}-v1`;
      const presentation = buildPolicyPresentationFromPolicyId(policyId, pack.id);
      expect(presentation?.disclosed_result).toBe(pack.disclosed_result);
      expect(presentation?.receipt_claim).toBe(pack.receipt_claim);
    }
  });

  it("maps human labels without renaming protocol result families", () => {
    const pack = inferPolicyPackFromPolicyId("demo-wallet_control-v1", "wallet_control");
    expect(pack?.disclosed_result).toBe("wallet_control_confirmed");
    expect(humanizeHolderResult(pack!.disclosed_result)).toBe("Wallet control confirmed");
    expect(humanizeHolderResult(pack!.disclosed_result)).not.toBe(pack!.disclosed_result);
  });

  it("derives withheld lists from disclosure profiles, not invented guarantees", () => {
    const agePack = inferPolicyPackFromPolicyId("demo-age_21_retail-v1", "age_21_retail");
    const ageProfile = resolveDisclosureProfile(agePack!.id);
    const ageBrief = buildHolderRequestBrief({
      policyId: "demo-age_21_retail-v1",
      partnerId: "demo",
    });
    const ageView = buildHolderVerificationPresentation({
      partnerName: "Demo",
      policyId: "demo-age_21_retail-v1",
      brief: ageBrief,
    });
    expect(ageProfile.ok).toBe(true);
    for (const item of ageProfile.profile!.withheld) {
      expect(ageBrief.withheld.join(" ").toLowerCase()).toContain(item.toLowerCase().split(" ")[0]);
    }
    expect(ageView.staysPrivate.join(" ").toLowerCase()).not.toContain("wallet address");
  });
});
