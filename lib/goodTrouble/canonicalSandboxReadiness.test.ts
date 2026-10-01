// FILE: lib/goodTrouble/canonicalSandboxReadiness.test.ts

import { describe, expect, it } from "vitest";
import {
  evaluateCanonicalSandboxReadiness,
  sandboxReadinessLeaks,
} from "@/lib/goodTrouble/canonicalSandboxReadiness";
import {
  GOOD_TROUBLE_CANONICAL_APP_SLUG,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalSandboxConfig";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

const APP_ID = "690d0c89-7b98-4946-8ad2-7469f5ca89d9";

function sandboxApp(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: APP_ID,
    public_slug: GOOD_TROUBLE_CANONICAL_APP_SLUG,
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    application_name: "Good Trouble",
    display_name: "Good Trouble",
    environment: "sandbox",
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policy_version: 1,
    policy_template_id: GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
    allowed_return_urls: [GOOD_TROUBLE_EXPECTED_CALLBACK_URL],
    api_key_id: "4811612e-8c28-4f9b-8ef9-e5a005265b7d",
    production_api_key_id: null,
    production_key_revealed_at: null,
    production_activated_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-09-30T17:09:40.508Z",
    updated_at: "2026-09-30T17:09:40.508Z",
    ...overrides,
  };
}

describe("canonical sandbox readiness", () => {
  it("passes when canonical application, callback, and sandbox credential are ready", async () => {
    const report = await evaluateCanonicalSandboxReadiness({
      loadApplication: async () => sandboxApp(),
      loadSandboxCredential: async () => ({
        id: "4811612e-8c28-4f9b-8ef9-e5a005265b7d",
        key_prefix: "abx_test_oWlhyY3",
        revoked_at: null,
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        launchpad_application_id: null,
      }),
      countVerifiedReceipts: async () => 0,
      primaryBindingId: (id) => `primary:${id}`,
    });

    expect(report.ready_for_first_test).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.truth.callback_allowlisted).toBe(true);
    expect(report.truth.launchpad_stage).toBe("connection_required");
    expect(report.truth.sandbox_credential.key_prefix).toBe("abx_test_oWlhyY3");
  });

  it("fails when Wix callback is missing from application allowlist", async () => {
    const report = await evaluateCanonicalSandboxReadiness({
      loadApplication: async () => sandboxApp({ allowed_return_urls: [] }),
      loadSandboxCredential: async () => ({
        id: "key-1",
        key_prefix: "abx_test_xxxx",
        revoked_at: null,
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        launchpad_application_id: null,
      }),
      countVerifiedReceipts: async () => 0,
    });

    expect(report.ready_for_first_test).toBe(false);
    expect(report.blockers).toContain("wix_callback_not_allowlisted");
  });

  it("does not leak sandbox credential secrets in report output", async () => {
    const report = await evaluateCanonicalSandboxReadiness({
      loadApplication: async () => sandboxApp(),
      loadSandboxCredential: async () => ({
        id: "key-1",
        key_prefix: "abx_test_secret",
        revoked_at: null,
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        launchpad_application_id: null,
      }),
      countVerifiedReceipts: async () => 0,
    });

    expect(sandboxReadinessLeaks(report)).toEqual([]);
    expect(JSON.stringify(report)).not.toMatch(/abx_test_[A-Za-z0-9]{8,}/);
  });
});
