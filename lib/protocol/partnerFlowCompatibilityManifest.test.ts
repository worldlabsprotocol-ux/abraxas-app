import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PARTNER_CALLBACK_PARAMS,
  FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS,
  FROZEN_PARTNER_VERIFICATION_RESULT_KEYS,
  FROZEN_PUBLIC_RECEIPT_VIEW_KEYS,
  FROZEN_TRUST_DECISION_KEYS,
  FROZEN_TRUST_DECISION_PROOF_KEYS,
} from "@/lib/protocol/compatibility";
import {
  PARTNER_FLOW_COMPATIBILITY_VERSION,
  PARTNER_FLOW_FROZEN_NEXT_STEPS,
  FROZEN_PARTNER_FLOW_BROWSER_API_PATHS,
  FROZEN_PARTNER_FLOW_BROWSER_ENTRY_PATH,
  FROZEN_PARTNER_FLOW_PUBLIC_RECEIPT_PATH,
  FROZEN_RECEIPT_INVALIDATION_REASON_PREFIXES,
  buildPartnerFlowCompatibilityManifest,
  assertManifestSynchronizedWithImplementation,
} from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { PARTNER_FLOW_SAFE_ERROR_CODES } from "@/lib/partner/partnerFlowAuditContract";
import {
  PARTNER_FLOW_DOCUMENTED_OPERATIONS,
  PARTNER_FLOW_OPENAPI_CANONICAL_URL,
} from "@/lib/partner/partnerFlowOpenApiContract";
import { SITE_URL } from "@/lib/siteUrl";

describe("Partner Flow compatibility manifest", () => {
  const manifest = buildPartnerFlowCompatibilityManifest();

  it("pins compatibility version constant", () => {
    expect(PARTNER_FLOW_COMPATIBILITY_VERSION).toBe("1.0.0");
    expect(manifest.compatibility_version).toBe(PARTNER_FLOW_COMPATIBILITY_VERSION);
  });

  it("stays synchronized with frozen implementation constants", () => {
    expect(() => assertManifestSynchronizedWithImplementation(manifest)).not.toThrow();
  });

  it("freezes canonical production origin and public manifest URL", () => {
    expect(manifest.canonical_origin).toBe(SITE_URL);
    expect(manifest.canonical_origin).toBe("https://abraxasworld.xyz");
    expect(manifest.manifest_url).toBe(`${SITE_URL}/api/protocol/compatibility`);
    expect(manifest.openapi_url).toBe(PARTNER_FLOW_OPENAPI_CANONICAL_URL);
  });

  it("freezes browser entry, evaluate, complete, refresh, and public receipt paths", () => {
    expect(manifest.browser_paths.entry).toBe(FROZEN_PARTNER_FLOW_BROWSER_ENTRY_PATH);
    expect(manifest.browser_paths.evaluate).toBe(FROZEN_PARTNER_FLOW_BROWSER_API_PATHS[0]);
    expect(manifest.browser_paths.complete).toBe(FROZEN_PARTNER_FLOW_BROWSER_API_PATHS[1]);
    expect(manifest.browser_paths.refresh).toBe(FROZEN_PARTNER_FLOW_BROWSER_API_PATHS[2]);
    expect(manifest.browser_paths.public_receipt).toBe(FROZEN_PARTNER_FLOW_PUBLIC_RECEIPT_PATH);
  });

  it("freezes callback query parameters and explicit no-PII rule", () => {
    expect([...manifest.callback.query_parameters].sort()).toEqual(
      [...PARTNER_CALLBACK_PARAMS].sort(),
    );
    expect(manifest.callback.no_pii_rule.toLowerCase()).toContain("must not contain");
    expect(manifest.callback.forbidden_query_keys).toContain("wallet_address");
    expect(manifest.callback.forbidden_query_keys).toContain("date_of_birth");
  });

  it("freezes public receipt view fields and validation rules", () => {
    expect([...manifest.public_receipt.frozen_view_fields].sort()).toEqual(
      [...FROZEN_PUBLIC_RECEIPT_VIEW_KEYS].sort(),
    );
    expect(manifest.public_receipt.validation_rules.length).toBeGreaterThan(0);
    expect(manifest.public_receipt.required_view_fields).toContain("signature_valid");
    expect(manifest.public_receipt.required_view_fields).toContain("production_usable");
  });

  it("freezes partner-flow response shapes and next steps", () => {
    expect([...manifest.partner_flow_response.next_values]).toEqual(
      [...PARTNER_FLOW_FROZEN_NEXT_STEPS],
    );
    expect([...manifest.partner_flow_response.evaluate_enter_keys].sort()).toEqual(
      [...FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS].sort(),
    );
    expect([...manifest.partner_flow_response.partner_result_keys].sort()).toEqual(
      [...FROZEN_PARTNER_VERIFICATION_RESULT_KEYS].sort(),
    );
  });

  it("freezes trust decision API field sets", () => {
    expect([...manifest.trust_decision_api.frozen_field_keys].sort()).toEqual(
      [...FROZEN_TRUST_DECISION_KEYS].sort(),
    );
    expect([...manifest.trust_decision_api.frozen_proof_keys].sort()).toEqual(
      [...FROZEN_TRUST_DECISION_PROOF_KEYS].sort(),
    );
  });

  it("freezes stable audit-safe error codes and receipt invalidation prefixes", () => {
    expect([...manifest.stable_error_codes.audit_safe_codes]).toEqual(
      [...PARTNER_FLOW_SAFE_ERROR_CODES],
    );
    expect([...manifest.public_receipt.invalidation_reason_prefixes]).toEqual(
      [...FROZEN_RECEIPT_INVALIDATION_REASON_PREFIXES],
    );
  });

  it("documents intentional exclusions from public guarantee", () => {
    expect(manifest.intentional_exclusions.some(e => e.includes("/api/admin"))).toBe(true);
    expect(manifest.intentional_exclusions.some(e => e.toLowerCase().includes("oauth"))).toBe(true);
    expect(manifest.excluded_from_public_guarantee.length).toBeGreaterThan(0);
  });

  it("documents operations match OpenAPI contract metadata", () => {
    expect(manifest.documented_operations).toEqual(PARTNER_FLOW_DOCUMENTED_OPERATIONS);
  });

  it("OpenAPI spec version aligns with compatibility manifest", () => {
    const spec = readFileSync(
      resolve(process.cwd(), "public/openapi/partner-flow.openapi.yaml"),
      "utf8",
    );
    expect(spec).toContain(`version: ${PARTNER_FLOW_COMPATIBILITY_VERSION}`);
    expect(spec).toContain(`url: ${SITE_URL}`);
  });

  it("requires compatibility version bump when frozen callback params change", () => {
    const tampered = buildPartnerFlowCompatibilityManifest();
    tampered.callback.query_parameters = ["status"];
    expect(() => assertManifestSynchronizedWithImplementation(tampered)).toThrow(/callback query_parameters drift/);
  });
});
