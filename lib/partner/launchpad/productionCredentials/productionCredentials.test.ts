// FILE: lib/partner/launchpad/productionCredentials/productionCredentials.test.ts

import { describe, expect, it } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import { sanitizeLaunchpadActivityMetadata, projectLaunchpadActivityEvent } from "@/lib/privacy/selectiveDisclosure/activityMetadata";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import {
  evaluateProductionCredentialPrereqs,
  productionCredentialLeaks,
  productionCredentialState,
} from "./evaluate";
import { productionCredentialClientOverride } from "./csrf";
import { PRODUCTION_CREDENTIAL_CONFIRMATION, PRODUCTION_LIVE_KEY_SCOPES } from "./contract";

function app(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: "app-1",
    public_slug: "acme-app",
    partner_id: "acme",
    application_name: "Acme sandbox",
    display_name: "Acme",
    environment: "sandbox",
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    policy_template_id: "age_21_retail",
    allowed_return_urls: ["https://partner.example/callback"],
    api_key_id: "key-1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function evidence(overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: "app-1",
    partnerId: "acme",
    status: "active",
    environment: "sandbox",
    policyId: "acme-age_21_retail-v1",
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["https://partner.example/callback"],
    activeSandboxKey: true,
    webhookConfigured: true,
    webhookEnabled: true,
    latestDeliveryStatus: "delivered",
    verifiedHostnames: ["partner.example"],
    starterKitEvidenced: true,
    starterKitRuntime: "typescript_nextjs",
    request: { id: "req-1", status: "approved", created_at: "2026-01-02T00:00:00.000Z", reviewed_at: "2026-01-03T00:00:00.000Z" },
    ...overrides,
  };
}

describe("production credential prerequisites", () => {
  it("requires an approved Production-review decision", () => {
    for (const status of ["pending", "rejected"] as const) {
      const gates = evaluateProductionCredentialPrereqs({
        request: { id: "req-1", application_id: "app-1", partner_id: "acme", status },
        application: app(),
        evidence: evidence({ request: { id: "req-1", status, created_at: "t", reviewed_at: null } }),
        durableSchemaReady: true,
      });
      expect(gates.ok).toBe(false);
      expect(gates.blockers).toContain("review_not_approved");
      expect(gates.blockers).not.toContain("request_not_pending");
      expect(gates.issues_production_key).toBe(false);
    }
  });

  it("re-checks server readiness even after approval", () => {
    const gates = evaluateProductionCredentialPrereqs({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved" },
      application: app(),
      evidence: evidence({ activeSandboxKey: false, allowedReturnUrls: [], verifiedHostnames: [] }),
      durableSchemaReady: true,
    });
    expect(gates.ok).toBe(false);
    expect(gates.blockers).toContain("readiness_incomplete");
  });

  it("denies disabled or planned Mainnet paths", () => {
    expect(evaluateProductionCredentialPrereqs({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: true,
      requestedNetworkIds: ["arc_circle_mainnet"],
    }).blockers).toContain("network_disabled");
  });

  it("denies tenant mismatch, suspended apps, and missing durable schema", () => {
    expect(evaluateProductionCredentialPrereqs({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved" },
      application: app({ partner_id: "other" }),
      evidence: evidence(),
      durableSchemaReady: true,
    }).blockers).toContain("app_mismatch");
    expect(evaluateProductionCredentialPrereqs({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved" },
      application: app({ status: "suspended" }),
      evidence: evidence({ status: "suspended" }),
      durableSchemaReady: true,
    }).blockers).toContain("revocation_unresolved");
    expect(evaluateProductionCredentialPrereqs({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: false,
    }).blockers).toContain("durable_schema_missing");
  });

  it("allows issuance only when approval and server checks pass, without activating Mainnet", () => {
    const gates = evaluateProductionCredentialPrereqs({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: true,
    });
    expect(gates.ok).toBe(true);
    expect(gates.activates_mainnet).toBe(false);
    expect(gates.executes).toBe(false);
    expect(gates.issues_production_key).toBe(false);
  });
});

describe("credential state, prefixes, and client fields", () => {
  it("maps never_issued, active, revoked, and unavailable", () => {
    expect(productionCredentialState({ productionApiKeyId: null, revoked: false, schemaReady: true })).toBe("never_issued");
    expect(productionCredentialState({ productionApiKeyId: "k1", revoked: false, schemaReady: true })).toBe("active");
    expect(productionCredentialState({ productionApiKeyId: "k1", revoked: true, schemaReady: true })).toBe("revoked");
    expect(productionCredentialState({ productionApiKeyId: "k1", revoked: false, schemaReady: false })).toBe("unavailable");
  });

  it("keeps sandbox and live prefixes separate", () => {
    const testKey = generatePartnerKey("test");
    const liveKey = generatePartnerKey("live");
    expect(testKey.raw.startsWith("abx_test_")).toBe(true);
    expect(liveKey.raw.startsWith("abx_live_")).toBe(true);
    expect(testKey.prefix.startsWith("abx_test_")).toBe(true);
    expect(liveKey.prefix.startsWith("abx_live_")).toBe(true);
    expect(PRODUCTION_LIVE_KEY_SCOPES).toContain("verify:credential");
  });

  it("rejects client override and authority fields", () => {
    expect(productionCredentialClientOverride({ action: "issue", confirm: true })).toBe(false);
    expect(productionCredentialClientOverride({ action: "issue", confirm: true, api_key: "abx_live_secret" })).toBe(true);
    expect(productionCredentialClientOverride({ action: "issue", partner_id: "acme" })).toBe(true);
    expect(productionCredentialClientOverride({ action: "issue", activate_mainnet: true })).toBe(true);
    expect(productionCredentialClientOverride({ action: "issue", environment: "production" })).toBe(true);
  });

  it("treats a GET-style envelope as leak-free and allows one raw key only on issuance", () => {
    const live = generatePartnerKey("live");
    expect(productionCredentialLeaks({
      ok: true,
      credential_state: "active",
      request_id: "req-1",
      activates_mainnet: false,
      executes: false,
    })).toEqual([]);
    expect(productionCredentialLeaks({ api_key: live.raw }, true)).toEqual([]);
    expect(productionCredentialLeaks({ api_key: live.raw, extra: live.raw }, true)).toContain("duplicate_raw_live_key");
    expect(productionCredentialLeaks({ api_key: live.raw })).toContain("raw_live_key");
    expect(productionCredentialLeaks({ api_key: generatePartnerKey("test").raw })).toContain("sandbox_key_in_live_path");
    expect(PRODUCTION_CREDENTIAL_CONFIRMATION).toMatch(/displayed once/i);
  });

  it("serializes operator audit metadata without raw keys", () => {
    const live = generatePartnerKey("live");
    const sanitized = sanitizeLaunchpadActivityMetadata({
      request_id: "req-1",
      policy_id: "acme-age_21_retail-v1",
      policy_version: 1,
      key_prefix: live.prefix,
      issues_production_key: true,
      activates_production: false,
      api_key: live.raw,
      receipt_id: "rcpt_secret",
    });
    expect(sanitized.request_id).toBe("req-1");
    expect(sanitized.activates_production).toBe(false);
    expect(sanitized).not.toHaveProperty("api_key");
    expect(sanitized).not.toHaveProperty("receipt_id");
    const projected = projectLaunchpadActivityEvent({
      id: "evt-1",
      event_type: "production_credential_issued",
      public_code: "production_credential_issued",
      metadata: sanitized,
      created_at: "2026-01-04T00:00:00.000Z",
    });
    expect(JSON.stringify(projected)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
  });
});
