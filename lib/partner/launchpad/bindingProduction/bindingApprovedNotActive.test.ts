// FILE: lib/partner/launchpad/bindingProduction/bindingApprovedNotActive.test.ts
// Regression: production_approved ≠ production_active authorization.

import { describe, expect, it } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { ApplicationPolicyBindingRow } from "@/lib/partner/launchpad/applicationPolicyBindings";
import {
  bindingProductionAuthorized,
  materializeResolvedBinding,
} from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";

const productionApp: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "good-trouble",
  partner_id: "good-trouble",
  application_name: "Good Trouble",
  display_name: "Good Trouble",
  environment: "production",
  policy_id: "good-trouble-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://example.com/callback"],
  api_key_id: "key-1",
  production_api_key_id: "prod-1",
  production_key_revealed_at: null,
  production_activated_at: "2026-01-01T00:00:00.000Z",
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const approvedNotActiveBinding: ApplicationPolicyBindingRow = {
  id: "b-residency",
  application_id: productionApp.id,
  partner_id: productionApp.partner_id,
  policy_id: "good-trouble-residency_us-v1",
  policy_version: 1,
  policy_template_id: "residency_us",
  binding_role: "secondary",
  status: "active",
  sandbox_configured_at: "2026-01-02T00:00:00.000Z",
  production_authorized_at: "2026-02-01T00:00:00.000Z",
  production_status: "production_approved",
};

describe("binding production_approved vs production_active", () => {
  it("does not authorize secondary binding until production_active", () => {
    expect(bindingProductionAuthorized({ binding: approvedNotActiveBinding, application: productionApp })).toBe(false);
    const resolved = materializeResolvedBinding({ binding: approvedNotActiveBinding, application: productionApp });
    expect(resolved?.environment).toBe("sandbox");
    expect(resolved?.production_authorized).toBe(false);
  });

  it("authorizes secondary binding when production_active with authorized_at", () => {
    const activeBinding = { ...approvedNotActiveBinding, production_status: "production_active" as const };
    expect(bindingProductionAuthorized({ binding: activeBinding, application: productionApp })).toBe(true);
    const resolved = materializeResolvedBinding({ binding: activeBinding, application: productionApp });
    expect(resolved?.environment).toBe("production");
    expect(resolved?.production_authorized).toBe(true);
  });
});
