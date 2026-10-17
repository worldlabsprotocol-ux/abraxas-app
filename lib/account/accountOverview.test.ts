import { describe, expect, it } from "vitest";
import { buildAccountOverview } from "@/lib/account/buildAccountOverview";
import { filterAccountNavItems, ACCOUNT_NAV_PRIMARY } from "@/lib/account/accountNavItems";

describe("buildAccountOverview", () => {
  it("never implies holder session authorizes partner console", () => {
    const payload = buildAccountOverview({
      holderSession: {
        subjectId: "0x" + "a".repeat(64),
        suiAddress: "0x" + "a".repeat(64),
        authMethod: "oauth",
      },
      partnerSession: null,
    });
    expect(payload.holder.authenticated).toBe(true);
    expect(payload.partner_console.authenticated).toBe(false);
    expect(payload.sessions_are_independent).toBe(true);
  });

  it("reports partner session without holder session", () => {
    const payload = buildAccountOverview({
      holderSession: null,
      partnerSession: {
        partnerId: "partner_demo",
        apiKeyId: "key-1",
        environment: "sandbox",
      },
    });
    expect(payload.holder.authenticated).toBe(false);
    expect(payload.partner_console.authenticated).toBe(true);
    expect(payload.partner_console.partner_id).toBe("partner_demo");
  });

  it("keeps both sessions distinct when both present", () => {
    const payload = buildAccountOverview({
      holderSession: { subjectId: "0x" + "b".repeat(64), authMethod: "wallet" },
      partnerSession: {
        partnerId: "other_partner",
        apiKeyId: "key-2",
        environment: "production",
      },
    });
    expect(payload.holder.authenticated).toBe(true);
    expect(payload.partner_console.environment).toBe("production");
  });
});

describe("filterAccountNavItems", () => {
  it("hides holder-only destinations when signed out", () => {
    const items = filterAccountNavItems(ACCOUNT_NAV_PRIMARY, { holderSignedIn: false });
    expect(items.some((i) => i.href === "/passport")).toBe(false);
    expect(items.some((i) => i.href === "/account/applications")).toBe(true);
  });

  it("shows passport when signed in", () => {
    const items = filterAccountNavItems(ACCOUNT_NAV_PRIMARY, { holderSignedIn: true });
    expect(items.some((i) => i.href === "/passport")).toBe(true);
  });
});
