import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import SwaggerParser from "@apidevtools/swagger-parser";
import {
  PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH,
  PARTNER_FLOW_OPENAPI_SPEC_VERSION,
  PARTNER_OPENAPI_AUTHORIZATION_STATES,
  PARTNER_OPENAPI_HANDOFF_REQUEST_KEYS,
  PARTNER_OPENAPI_HANDOFF_RESPONSE_FIELDS,
  PARTNER_OPENAPI_HANDOFF_RUNTIMES,
  PARTNER_OPENAPI_NARROW_RESULT_FIELDS,
  PARTNER_OPENAPI_WEBHOOK_HEADERS,
  PARTNER_OPENAPI_WEBHOOK_PAYLOAD_KEYS,
  PARTNER_FLOW_RECEIPT_SECURITY_FIELDS,
} from "@/lib/partner/partnerFlowOpenApiContract";
import { NARROW_PARTNER_RESULT_ALLOWED_FIELDS } from "@/lib/partner/narrowPartnerResult/contract";
import { NARROW_PARTNER_RESULT_ALLOWED_FIELDS as KIT_NARROW_FIELDS } from "@abraxas/partner-kit";
import {
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "@/lib/partner/webhooks/webhookSigning";

function loadParsedSpec(): Record<string, unknown> {
  const raw = readFileSync(join(process.cwd(), PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH), "utf8");
  return parseYaml(raw) as Record<string, unknown>;
}

function schemaEnum(spec: Record<string, unknown>, schemaName: string): string[] {
  const components = spec.components as { schemas?: Record<string, { enum?: string[]; properties?: Record<string, unknown> }> };
  const schema = components.schemas?.[schemaName];
  if (schema?.enum) return [...schema.enum];
  return [];
}

function schemaPropertyNames(spec: Record<string, unknown>, schemaName: string): string[] {
  const components = spec.components as { schemas?: Record<string, { properties?: Record<string, unknown> }> };
  const props = components.schemas?.[schemaName]?.properties ?? {};
  return Object.keys(props);
}

describe("partnerFlowOpenApi drift protection", () => {
  const spec = loadParsedSpec();

  it("validates OpenAPI 3.1 syntax and resolves $refs", async () => {
    const path = join(process.cwd(), PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH);
    const api = await SwaggerParser.validate(path);
    expect(api.openapi).toMatch(/^3\.1\./);
    expect(api.info?.version).toBe(PARTNER_FLOW_OPENAPI_SPEC_VERSION);
    for (const op of Object.values(api.paths ?? {})) {
      for (const method of Object.values(op ?? {})) {
        if (method && typeof method === "object" && "operationId" in method) {
          expect(typeof (method as { operationId?: string }).operationId).toBe("string");
        }
      }
    }
  });

  it("keeps handoff request keys aligned with runtime contract", () => {
    const props = schemaPropertyNames(spec, "HostedHandoffCreateRequest");
    expect([...props].sort()).toEqual([...PARTNER_OPENAPI_HANDOFF_REQUEST_KEYS].sort());
  });

  it("keeps handoff runtimes aligned with runtime contract", () => {
    const runtimes = schemaEnum(spec, "HostedHandoffRuntime");
    expect(runtimes).toEqual([...PARTNER_OPENAPI_HANDOFF_RUNTIMES]);
  });

  it("keeps handoff response fields aligned with HostedHandoffPartnerView", () => {
    const viewFields = schemaPropertyNames(spec, "HostedHandoffPartnerView");
    for (const field of PARTNER_OPENAPI_HANDOFF_RESPONSE_FIELDS) {
      if (field === "ok") continue;
      expect(viewFields, `missing HostedHandoffPartnerView.${field}`).toContain(field);
    }
  });

  it("keeps narrow result fields aligned with app and PartnerKit contracts", () => {
    const narrowFields = schemaPropertyNames(spec, "NarrowPartnerResult");
    expect([...PARTNER_OPENAPI_NARROW_RESULT_FIELDS].sort()).toEqual([...NARROW_PARTNER_RESULT_ALLOWED_FIELDS].sort());
    expect([...KIT_NARROW_FIELDS].sort()).toEqual([...NARROW_PARTNER_RESULT_ALLOWED_FIELDS].sort());
    for (const field of PARTNER_OPENAPI_NARROW_RESULT_FIELDS) {
      expect(narrowFields, `missing NarrowPartnerResult.${field}`).toContain(field);
    }
    expect(narrowFields).not.toContain("wallet_address");
    expect(narrowFields).not.toContain("date_of_birth");
  });

  it("keeps authorization states aligned with canonical holder authorization", () => {
    const states = schemaEnum(spec, "HolderAuthorizationState");
    expect(states).toEqual([...PARTNER_OPENAPI_AUTHORIZATION_STATES]);
    const nextSteps = schemaEnum(spec, "PartnerFlowNextStep");
    expect(nextSteps).toContain("verification_required");
  });

  it("keeps public receipt security fields in DecisionReceiptPublicView", () => {
    const receiptFields = schemaPropertyNames(spec, "DecisionReceiptPublicView");
    for (const field of PARTNER_FLOW_RECEIPT_SECURITY_FIELDS) {
      expect(receiptFields, `missing DecisionReceiptPublicView.${field}`).toContain(field);
    }
    expect(receiptFields).toContain("currently_valid");
    expect(receiptFields).toContain("lifecycle_status");
    expect(receiptFields).toContain("partner_safe_reason");
  });

  it("keeps webhook payload keys and headers aligned with signing contract", () => {
    const webhookFields = schemaPropertyNames(spec, "PartnerWebhookPayload");
    for (const key of PARTNER_OPENAPI_WEBHOOK_PAYLOAD_KEYS) {
      expect(webhookFields, `missing PartnerWebhookPayload.${key}`).toContain(key);
    }
    const info = spec.info as { description?: string; "x-abraxas-partner-webhook"?: string };
    const blob = `${info.description ?? ""}\n${info["x-abraxas-partner-webhook"] ?? ""}`;
    expect(blob).toContain(WEBHOOK_TIMESTAMP_HEADER);
    expect(blob).toContain(WEBHOOK_EVENT_ID_HEADER);
    expect(blob).toContain(WEBHOOK_SIGNATURE_HEADER);
    expect([...PARTNER_OPENAPI_WEBHOOK_HEADERS]).toEqual([
      WEBHOOK_TIMESTAMP_HEADER,
      WEBHOOK_EVENT_ID_HEADER,
      WEBHOOK_SIGNATURE_HEADER,
    ]);
  });

  it("documents partner bearer auth without live credential examples", () => {
    const raw = readFileSync(join(process.cwd(), PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH), "utf8");
    expect(raw).toContain("abx_test_");
    expect(raw).toContain("abx_live_");
    expect(raw).not.toMatch(/abx_test_[a-zA-Z0-9]{20,}/);
    expect(raw).not.toMatch(/abx_live_[a-zA-Z0-9]{20,}/);
    expect(raw).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(raw).not.toContain("CRON_SECRET");
  });
});
