// FILE: lib/partner/build584/browserAcceptanceArtifact.test.ts

import { describe, expect, it } from "vitest";
import { validateBuild584BrowserArtifact } from "@/lib/partner/build584/browserAcceptanceArtifact";

describe("validateBuild584BrowserArtifact", () => {
  it("blocks tier when only partner authentication succeeded", () => {
    const result = validateBuild584BrowserArtifact({
      ok: false,
      walkthrough_complete: false,
      partner_authentication_confirmed: true,
      routes_tested: ["/developers/launchpad"],
      evidence_sources: ["/tmp/shot.png"],
      api_observations: [{
        label: "session_after_sign_in",
        method: "GET",
        path: "/api/launchpad/auth/session",
        http_status: 200,
        authenticated: true,
      }],
      stages: {
        partner_authentication: { status: "pass", detail: "confirmed" },
        application_access: { status: "blocked", detail: "no app id" },
        institutional_configuration: { status: "blocked", detail: "pending" },
        hosted_holder_authorization: { status: "blocked", detail: "manual" },
        independent_receipt_verification: { status: "blocked", detail: "manual" },
      },
    });
    expect(result.tier_status).toBe("blocked");
    expect(result.partner_authentication_complete).toBe(true);
    expect(result.walkthrough_complete).toBe(false);
  });
});
