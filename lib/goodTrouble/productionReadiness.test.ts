// FILE: lib/goodTrouble/productionReadiness.test.ts

import { describe, expect, it } from "vitest";
import {
  evaluateGoodTroubleProductionReadiness,
  productionReadinessLeaks,
  type GoodTroubleReadinessDeps,
  type ProductionCredentialSummary,
} from "@/lib/goodTrouble/productionReadiness";
import {
  GOOD_TROUBLE_CANONICAL_APP_SLUG,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
  GOOD_TROUBLE_LEGACY,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import type { ApplicationPolicyBindingRow } from "@/lib/partner/launchpad/applicationPolicyBindings";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  acceptanceChecklistComplete,
  buildInvestorTransactionEvidence,
  buildProductionAcceptanceChecklist,
  investorEvidenceLeaks,
} from "@/lib/goodTrouble/productionAcceptanceChecklist";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

const APP_ID = "11111111-1111-1111-1111-111111111111";
const BINDING_ID = "b-age-prod";

function productionApp(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: APP_ID,
    public_slug: GOOD_TROUBLE_CANONICAL_APP_SLUG,
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    application_name: "Good Trouble",
    display_name: "Good Trouble",
    environment: "production",
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policy_version: 1,
    policy_template_id: GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
    allowed_return_urls: [GOOD_TROUBLE_EXPECTED_CALLBACK_URL],
    api_key_id: "key-sandbox",
    production_api_key_id: "prod-key-1",
    production_key_revealed_at: null,
    production_activated_at: "2026-01-01T00:00:00.000Z",
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function ageBinding(overrides: Partial<ApplicationPolicyBindingRow> = {}): ApplicationPolicyBindingRow {
  return {
    id: BINDING_ID,
    application_id: APP_ID,
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policy_version: 1,
    policy_template_id: GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
    binding_role: "primary",
    status: "active",
    sandbox_configured_at: "2026-01-01T00:00:00.000Z",
    production_authorized_at: "2026-01-01T00:00:00.000Z",
    production_status: "production_active",
    ...overrides,
  };
}

function activeCredential(overrides: Partial<ProductionCredentialSummary> = {}): ProductionCredentialSummary {
  return {
    id: "prod-key-1",
    key_prefix: "abx_live_xxxxxxx",
    revoked_at: null,
    launchpad_application_id: APP_ID,
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    ...overrides,
  };
}

function deps(input: {
  app?: LaunchpadApplicationRow | null;
  bindings?: ApplicationPolicyBindingRow[];
  credential?: ProductionCredentialSummary | null;
  tables?: Record<string, boolean>;
  events?: IntegrationEventRow[];
}): GoodTroubleReadinessDeps {
  const app = input.app === undefined ? productionApp() : input.app;
  const bindings = input.bindings ?? [ageBinding()];
  const credential = input.credential === undefined ? activeCredential() : input.credential;
  const tables = input.tables ?? {
    hosted_partner_flow_handoffs: true,
    partner_integration_events: true,
  };
  return {
    loadApplication: async () => app,
    loadBindings: async () => bindings,
    loadProductionCredential: async () => credential,
    tableExists: async (table) => tables[table] ?? true,
    loadProductionEvents: async () => input.events ?? [],
    fileExists: () => true,
  };
}

describe("Good Trouble production readiness", () => {
  it("fails closed when canonical application is absent", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(deps({ app: null }));
    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("launchpad_application");
  });

  it("fails when age_21_retail binding is absent", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(
      deps({ bindings: [] }),
    );
    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("age_21_retail_binding");
  });

  it("fails when binding is not production authorized", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(
      deps({
        bindings: [ageBinding({
          binding_role: "secondary",
          production_status: "sandbox_only",
          production_authorized_at: null,
        })],
      }),
    );
    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("binding_production_authorized");
  });

  it("fails without active live credential", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(
      deps({ credential: null }),
    );
    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("production_credential");
  });

  it("fails for revoked credential", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(
      deps({ credential: activeCredential({ revoked_at: "2026-01-02T00:00:00.000Z" }) }),
    );
    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("production_credential");
    expect(report.blockers).toContain("credential_not_revoked");
  });

  it("fails for unsafe or unapproved callback", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(
      deps({ app: productionApp({ allowed_return_urls: ["http://localhost:3000/callback"] }) }),
    );
    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("production_callback");
    expect(report.blockers).toContain("callback_good_trouble");
  });

  it("passes when all critical prerequisites are met", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(deps({}));
    expect(report.ready).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.result_family).toBe(GOOD_TROUBLE_CANONICAL_RESULT_FAMILY);
  });

  it("never prints credential secret in report output", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(deps({}));
    expect(productionReadinessLeaks(report)).toEqual([]);
    expect(JSON.stringify(report)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
  });

  it("distinguishes legacy sandbox configuration from canonical production", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(deps({}));
    expect(report.legacy_track.partner_id).toBe(GOOD_TROUBLE_LEGACY.partner_id);
    expect(report.canonical_track.partner_id).toBe(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    const legacyPolicyCheck = report.checks.find((c) => c.id === "not_legacy_policy");
    expect(legacyPolicyCheck?.status).toBe("PASS");
  });

  it("flags legacy policy pin as failure", async () => {
    const report = await evaluateGoodTroubleProductionReadiness(
      deps({ app: productionApp({ policy_id: GOOD_TROUBLE_LEGACY.retail_policy_id }) }),
    );
    const legacyPolicyCheck = report.checks.find((c) => c.id === "not_legacy_policy");
    expect(legacyPolicyCheck?.status).toBe("FAIL");
  });
});

describe("Good Trouble production acceptance checklist", () => {
  it("cannot mark transaction stages complete without evidence", async () => {
    const preflight = await evaluateGoodTroubleProductionReadiness(deps({}));
    const stages = buildProductionAcceptanceChecklist({ preflight, events: [] });
    expect(acceptanceChecklistComplete(stages)).toBe(false);
    expect(stages.find((s) => s.stage === "HANDOFF_CREATED")?.status).toBe("pending");
    expect(stages.find((s) => s.stage === "RECEIPT_ISSUED")?.status).toBe("pending");
    expect(stages.find((s) => s.stage === "PARTNER_VERIFIED")?.status).toBe("pending");
  });

  it("marks preflight ready when readiness passes", async () => {
    const preflight = await evaluateGoodTroubleProductionReadiness(deps({}));
    const stages = buildProductionAcceptanceChecklist({ preflight, events: [] });
    expect(stages.find((s) => s.stage === "PREFLIGHT_READY")?.status).toBe("observed");
  });

  it("investor evidence output contains no prohibited holder PII", () => {
    const evidence = buildInvestorTransactionEvidence({
      applicationId: APP_ID,
      bindingId: BINDING_ID,
      resultFamily: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
      events: [],
    });
    expect(investorEvidenceLeaks(evidence)).toEqual([]);
    expect(JSON.stringify(evidence).toLowerCase()).not.toContain("date_of_birth");
  });
});
