// FILE: lib/partner/build588.institutionalIntegrationWorkspace.test.ts

import { describe, expect, it } from "vitest";
import {
  buildInstitutionalIntegrationJourney,
  buildInstitutionalIntegrationWorkspace,
  buildInstitutionalSdkVerificationSnippet,
} from "@/lib/partner/launchpad/institutionalIntegrationWorkspace";
import { buildInstitutionalSdkReleaseView } from "@/lib/institutionalVerification/sdkRelease";
import { buildInstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import { institutionalIntegrationPayloadLeaks } from "@/lib/partner/launchpad/institutionalIntegrationSafety";

describe("Build #588 institutional integration workspace", () => {
  const app = {
    id: "app-1",
    public_slug: "acme-institutional",
    partner_id: "partner-a",
    application_name: "Acme Institutional",
    display_name: "Acme Institutional Sandbox",
    environment: "sandbox",
    policy_id: "sandbox_institutional_protocol_access",
    policy_version: 1,
    policy_template_id: "sandbox_institutional_protocol_access",
    allowed_return_urls: ["https://localhost:3000/callback"],
    api_key_id: "key-1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("renders ten journey steps in order", () => {
    const activation = buildInstitutionalActivationEvidence({
      applicationCreatedAt: app.created_at,
      journey: null,
      health: null,
      activeSandboxKey: false,
      starterKitEvidenced: false,
      callbackConfigured: true,
    });
    const journey = buildInstitutionalIntegrationJourney({
      binding: {
        application_id: app.id,
        public_slug: app.public_slug,
        display_name: app.display_name,
        environment: app.environment,
        partner_id: app.partner_id,
        policy_id: app.policy_id,
        policy_version: app.policy_version,
        policy_template_id: app.policy_template_id,
        receipt_audience: app.partner_id,
        production_blocked: true,
        sandbox_notice: "sandbox only",
      },
      activation,
      sdkDownloadAvailable: false,
      trustDigestAvailable: false,
      launchpadHref: "/developers/launchpad",
      hostedVerificationHref: "https://example.com/partner/verify",
    });
    expect(journey).toHaveLength(10);
    expect(journey.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("binds SDK snippet to partner and policy identifiers", () => {
    const snippet = buildInstitutionalSdkVerificationSnippet({
      application_id: app.id,
      public_slug: app.public_slug,
      display_name: app.display_name,
      environment: app.environment,
      partner_id: "partner-a",
      policy_id: "sandbox_institutional_protocol_access",
      policy_version: 1,
      policy_template_id: "sandbox_institutional_protocol_access",
      receipt_audience: "partner-a",
      production_blocked: true,
      sandbox_notice: "sandbox only",
    });
    expect(snippet).toContain('"partner-a"');
    expect(snippet).toContain('"sandbox_institutional_protocol_access"');
    expect(snippet).toContain("inspectSignedDecisionReceipt");
    expect(institutionalIntegrationPayloadLeaks({ sdk_snippet: snippet })).toEqual([]);
  });

  it("builds workspace payload without secret leaks", () => {
    const workspace = buildInstitutionalIntegrationWorkspace({
      app,
      sdkRelease: buildInstitutionalSdkReleaseView(),
      activation: null,
      firstVerifiedOutcome: null,
      trust: {
        receipt_key_document_digest: "abc123digest",
        receipt_key_environment: "sandbox",
        bootstrap_notice: "Pin offline.",
      },
      siteUrl: "https://abraxasworld.xyz",
      launchpadHref: "/developers/launchpad",
    });
    expect(workspace.contract_version).toBe("591.v1");
    expect(workspace.first_verified_outcome).toBeNull();
    expect(workspace.external_verification.status).toBe("operator_required");
    expect(workspace.external_verification.evidence_command).toContain("build-592");
    expect(workspace.binding.partner_id).toBe("partner-a");
    expect(workspace.sdk_release.integrity.approved_tarball_sha256).toBeNull();
    expect(workspace.sdk_release.download.available).toBe(false);
    expect(institutionalIntegrationPayloadLeaks({ workspace, sdk_snippet: "ok" })).toEqual([]);
  });
});
