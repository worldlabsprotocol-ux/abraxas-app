import { describe, expect, it } from "vitest";
import {
  assertPilotPartnerCreateStatus,
  assessPartnerPilotReadiness,
  buildConformanceCommand,
  buildSecondPartnerPilotChecklist,
  mergeReturnUrlAllowlist,
  validateReturnUrlsForAllowlist,
} from "@/lib/admin/partnerOnboardingConsole";

describe("partnerOnboardingConsole", () => {
  it("only allows pilot or recruiting status for new partner creation", () => {
    expect(assertPilotPartnerCreateStatus("pilot")).toBe("pilot");
    expect(assertPilotPartnerCreateStatus("recruiting")).toBe("recruiting");
    expect(() => assertPilotPartnerCreateStatus("active")).toThrow(/pilot or recruiting/i);
  });

  it("rejects invalid callback URLs fail-closed", () => {
    const result = validateReturnUrlsForAllowlist([
      "https://app.example.com/auth/callback",
      "http://evil.example.com/callback",
    ]);
    expect(result.accepted).toEqual(["https://app.example.com/auth/callback"]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.errors).toContain("return_url_http_requires_localhost");
  });

  it("merges return URL allowlists without duplicates", () => {
    expect(
      mergeReturnUrlAllowlist(
        ["https://app.example.com/auth/callback"],
        ["https://app.example.com/auth/callback", "https://staging.example.com/auth/callback"],
      ),
    ).toEqual([
      "https://app.example.com/auth/callback",
      "https://staging.example.com/auth/callback",
    ]);
  });

  it("assesses readiness as not_ready until policy and URLs exist", () => {
    const readiness = assessPartnerPilotReadiness({
      partner_id: "your-protocol-v1",
      status: "pilot",
      is_external: true,
      allowed_return_urls: [],
      active_policy: null,
    });
    expect(readiness.overall).toBe("not_ready");
    expect(readiness.blockers.length).toBeGreaterThan(0);
  });

  it("assesses readiness ready when partner, policy, and URLs are valid", () => {
    const readiness = assessPartnerPilotReadiness({
      partner_id: "your-protocol-v1",
      status: "pilot",
      is_external: true,
      allowed_return_urls: ["https://app.example.com/auth/callback"],
      active_policy: {
        id: "your-protocol-policy-v1",
        version: 1,
        status: "active",
        name: "Pilot",
        partner_id: "your-protocol-v1",
      },
      assigned_policy_id: "your-protocol-policy-v1",
    });
    expect(readiness.overall).toBe("ready");
    expect(readiness.conformance_config).toBe("pass");
  });

  it("builds second-partner pilot checklist with conformance command", () => {
    const record = {
      partner_id: "your-protocol-v1",
      company: "Your Protocol",
      status: "pilot",
      is_external: true,
      allowed_environments: ["sandbox"],
      allowed_return_urls: ["https://app.example.com/auth/callback"],
      assigned_policy_id: "your-protocol-policy-v1",
      use_case: null,
      legal_entity: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      active_policy: {
        id: "your-protocol-policy-v1",
        version: 1,
        status: "active",
        name: "Pilot",
        partner_id: "your-protocol-v1",
      },
      draft_policy: null,
      readiness: assessPartnerPilotReadiness({
        partner_id: "your-protocol-v1",
        status: "pilot",
        is_external: true,
        allowed_return_urls: ["https://app.example.com/auth/callback"],
        active_policy: {
          id: "your-protocol-policy-v1",
          version: 1,
          status: "active",
          name: "Pilot",
          partner_id: "your-protocol-v1",
        },
      }),
    };

    const checklist = buildSecondPartnerPilotChecklist(record);
    expect(checklist.find(i => i.id === "conformance")?.done).toBe(true);
    expect(checklist.find(i => i.id === "live_flow")?.done).toBe(false);

    const cmd = buildConformanceCommand(record);
    expect(cmd).toContain("PARTNER_FLOW_RP_PARTNER_ID=your-protocol-v1");
    expect(cmd).toContain("npm run partner:conformance");
  });
});
