// FILE: lib/admin/adminPartnerDeepLink.test.ts

import { describe, expect, it } from "vitest";
import {
  ADMIN_PARTNERS_TABS,
  buildAdminPartnersHref,
  parseAdminPartnerIdQuery,
  resolveAdminPartnersTab,
} from "./adminPartnerDeepLink";

describe("resolveAdminPartnersTab", () => {
  it("accepts each allowlisted tab", () => {
    for (const tab of ADMIN_PARTNERS_TABS) {
      expect(resolveAdminPartnersTab(tab)).toBe(tab);
    }
  });

  it("falls back to onboarding for invalid or missing tab", () => {
    expect(resolveAdminPartnersTab(null)).toBe("onboarding");
    expect(resolveAdminPartnersTab("")).toBe("onboarding");
    expect(resolveAdminPartnersTab("invalid-tab")).toBe("onboarding");
    expect(resolveAdminPartnersTab("onboarding-extra")).toBe("onboarding");
  });
});

describe("parseAdminPartnerIdQuery", () => {
  it("accepts valid partner ids", () => {
    expect(parseAdminPartnerIdQuery("acme-v1")).toBe("acme-v1");
    expect(parseAdminPartnerIdQuery("  partner_a  ")).toBe("partner_a");
  });

  it("rejects empty, overlong, or malformed partner ids", () => {
    expect(parseAdminPartnerIdQuery(null)).toBeUndefined();
    expect(parseAdminPartnerIdQuery("")).toBeUndefined();
    expect(parseAdminPartnerIdQuery("   ")).toBeUndefined();
    expect(parseAdminPartnerIdQuery("a".repeat(129))).toBeUndefined();
    expect(parseAdminPartnerIdQuery("../evil")).toBeUndefined();
    expect(parseAdminPartnerIdQuery("has space")).toBeUndefined();
    expect(parseAdminPartnerIdQuery("@partner")).toBeUndefined();
    expect(parseAdminPartnerIdQuery("-leading")).toBeUndefined();
  });
});

describe("buildAdminPartnersHref", () => {
  it("builds observability and sandbox-receipts deep links with encoded partner_id", () => {
    expect(buildAdminPartnersHref({ tab: "observability", partnerId: "acme-v1" })).toBe(
      "/admin/partners?tab=observability&partner_id=acme-v1",
    );
    expect(buildAdminPartnersHref({ tab: "sandbox-receipts", partnerId: "acme-v1" })).toBe(
      "/admin/partners?tab=sandbox-receipts&partner_id=acme-v1",
    );
  });

  it("omits partner_id when invalid", () => {
    expect(buildAdminPartnersHref({ tab: "observability", partnerId: "bad id" })).toBe(
      "/admin/partners?tab=observability",
    );
  });

  it("preserves onboarding tab without partner_id when omitted", () => {
    expect(buildAdminPartnersHref({ tab: "onboarding" })).toBe("/admin/partners?tab=onboarding");
  });
});
