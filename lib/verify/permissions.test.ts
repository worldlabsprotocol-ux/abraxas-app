import { describe, expect, it } from "vitest";
import {
  getPermissionDefinition,
  isPermissionAllowedForRelyingParty,
  permissionForPolicyId,
} from "@/lib/verify/permissions";
import {
  PermissionResolutionError,
  resolvePermissionForRelyingParty,
} from "@/lib/verify/resolvePermission";
import { buildVerifyAuthorizationUrl } from "@/lib/verify/authorize";
import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

describe("permission registry", () => {
  it("defines regulated_purchase with consent label and trust level", () => {
    const def = getPermissionDefinition("regulated_purchase");
    expect(def).toBeTruthy();
    expect(def!.consentLabel).toContain("regulated purchase");
    expect(def!.trustLevel).toBe(2);
    expect(def!.latestVersion).toBe("v1");
  });

  it("allows regulated_purchase for Good Trouble", () => {
    expect(isPermissionAllowedForRelyingParty(GOOD_TROUBLE_PARTNER_ID, "regulated_purchase")).toBe(true);
    expect(isPermissionAllowedForRelyingParty(GOOD_TROUBLE_PARTNER_ID, "accredited_investor")).toBe(false);
  });

  it("maps Good Trouble retail policy back to permission", () => {
    const mapped = permissionForPolicyId(GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(mapped).toEqual({ permission: "regulated_purchase", version: "v1" });
  });
});

describe("resolvePermissionForRelyingParty", () => {
  it("resolves unversioned regulated_purchase to GT retail policy", () => {
    const resolved = resolvePermissionForRelyingParty({
      relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
      permission: "regulated_purchase",
    });
    expect(resolved.policyId).toBe(GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(resolved.permissionVersion).toBe("v1");
    expect(resolved.consentLabel).toContain("regulated purchase");
  });

  it("rejects unknown permission", () => {
    expect(() => resolvePermissionForRelyingParty({
      relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
      permission: "unknown_permission",
    })).toThrow(PermissionResolutionError);
  });

  it("rejects permission not allowed for relying party", () => {
    expect(() => resolvePermissionForRelyingParty({
      relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
      permission: "property_transfer",
    })).toThrow(PermissionResolutionError);
  });
});

describe("buildVerifyAuthorizationUrl", () => {
  it("includes permission and policy params for partner verify", () => {
    const url = buildVerifyAuthorizationUrl({
      relyingPartyId: GOOD_TROUBLE_PARTNER_ID,
      permission: "regulated_purchase",
      permissionVersion: "v1",
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      redirectUri: "https://abraxas-app.vercel.app/good-trouble/enter",
      state: "abc123",
      trustRequestId: "tr_test",
    });
    expect(url).toContain("/partner/verify?");
    expect(url).toContain("permission=regulated_purchase");
    expect(url).toContain(`policy_id=${GOOD_TROUBLE_RETAIL_POLICY_ID}`);
    expect(url).toContain("state=abc123");
    expect(url).toContain("trust_request_id=tr_test");
  });
});
