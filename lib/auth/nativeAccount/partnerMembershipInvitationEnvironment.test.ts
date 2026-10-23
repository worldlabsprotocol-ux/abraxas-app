import { describe, expect, it } from "vitest";
import { assertPartnerMembershipInvitationEnvironment } from "@/lib/auth/nativeAccount/partnerMembershipInvitationEnvironment";
import { SITE_URL } from "@/lib/siteUrl";

describe("partnerMembershipInvitationEnvironment", () => {
  it("blocks production app origins", () => {
    const result = assertPartnerMembershipInvitationEnvironment(
      { environment: "sandbox" },
      { NEXT_PUBLIC_APP_URL: SITE_URL },
    );
    expect(result).toEqual({ ok: false, code: "production_origin_forbidden" });
  });

  it("blocks production launchpad applications on demo origin", () => {
    const result = assertPartnerMembershipInvitationEnvironment(
      { environment: "production" },
      { NEXT_PUBLIC_APP_URL: "https://demo.abraxasworld.xyz" },
    );
    expect(result).toEqual({ ok: false, code: "application_not_sandbox" });
  });

  it("allows sandbox applications on demo origin", () => {
    const result = assertPartnerMembershipInvitationEnvironment(
      { environment: "sandbox" },
      { NEXT_PUBLIC_APP_URL: "https://demo.abraxasworld.xyz" },
    );
    expect(result).toEqual({ ok: true });
  });
});
