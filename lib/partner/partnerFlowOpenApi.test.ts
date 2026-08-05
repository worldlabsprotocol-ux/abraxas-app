import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  PARTNER_FLOW_DOCUMENTED_OPERATIONS,
  PARTNER_FLOW_EXCLUDED_OPERATIONS,
  PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH,
  PARTNER_FLOW_OPENAPI_CANONICAL_URL,
  PARTNER_FLOW_RECEIPT_SECURITY_FIELDS,
  PARTNER_FLOW_CALLBACK_QUERY_PARAMS,
} from "@/lib/partner/partnerFlowOpenApiContract";
import { SITE_URL } from "@/lib/siteUrl";
import { DOCS_HUB_GROUPS } from "@/lib/docs/docsHub";

const STALE_HOST = "abraxas-app.vercel.app";

function readOpenApiSpec(): string {
  const path = join(process.cwd(), PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH);
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, "utf8");
}

function openApiPathKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

describe("partnerFlowOpenApi contract", () => {
  const spec = readOpenApiSpec();

  it("declares OpenAPI 3.1 with canonical abraxasworld.xyz server", () => {
    expect(spec).toMatch(/^openapi:\s*3\.1\.0/m);
    expect(spec).toContain(`url: ${SITE_URL}`);
    expect(spec).not.toContain(STALE_HOST);
    expect(PARTNER_FLOW_OPENAPI_CANONICAL_URL).toBe(
      "https://abraxasworld.xyz/openapi/partner-flow.openapi.yaml",
    );
  });

  it("documents only implemented Partner Flow routes", () => {
    for (const op of PARTNER_FLOW_DOCUMENTED_OPERATIONS) {
      const implPath = join(process.cwd(), op.implementation);
      expect(existsSync(implPath), `missing implementation for ${op.operationId}: ${op.implementation}`).toBe(
        true,
      );

      const pathPattern = op.path.replace(/\{[^}]+\}/g, "{[^}]+}");
      const pathRegex = new RegExp(
        `^\\s+${op.path.replace(/\{[^}]+\}/g, "\\{[^}]+\\}")}:\\s*$`,
        "m",
      );
      expect(spec).toMatch(pathRegex);

      const methodRegex = new RegExp(
        `\\n\\s+${op.method.toLowerCase()}:\\s*\\n[\\s\\S]*?operationId:\\s*${op.operationId}`,
      );
      expect(spec).toMatch(methodRegex);
    }

    const documentedKeys = new Set(
      PARTNER_FLOW_DOCUMENTED_OPERATIONS.map((op) => openApiPathKey(op.method, op.path)),
    );
    expect(documentedKeys.size).toBe(PARTNER_FLOW_DOCUMENTED_OPERATIONS.length);
  });

  it("lists excluded private/server-to-server operations without documenting them as paths", () => {
    for (const excluded of PARTNER_FLOW_EXCLUDED_OPERATIONS) {
      expect(spec).toContain(excluded.path);
      const pathLine = new RegExp(`^\\s+${excluded.path.replace(/\{[^}]+\}/g, "\\{[^}]+\\}")}:\\s*$`, "m");
      expect(spec).not.toMatch(pathLine);
    }
    expect(spec).toContain("x-abraxas-excluded-operations");
  });

  it("OpenAPI spec references compatibility manifest URL", () => {
    expect(spec).toContain("x-abraxas-compatibility-manifest:");
    expect(spec).toContain("/api/protocol/compatibility");
    expect(spec).toContain('x-abraxas-compatibility-version: "1.0.0"');
  });

  it("represents required receipt security fields in DecisionReceiptPublicView", () => {
    for (const field of PARTNER_FLOW_RECEIPT_SECURITY_FIELDS) {
      expect(spec).toMatch(new RegExp(`\\n\\s+${field}:`));
    }
    expect(spec).toContain("x-abraxas-receipt-validation");
    expect(spec).toContain("signature_valid === true");
    expect(spec).toContain('decision_result === "approved"');
    expect(spec).toContain('status === "active"');
    expect(spec).toContain("production_usable === true");
    expect(spec).toContain("allowSandbox");
  });

  it("documents frozen callback parameters with no-PII policy", () => {
    for (const param of PARTNER_FLOW_CALLBACK_QUERY_PARAMS) {
      expect(spec).toContain(param);
    }
    expect(spec).toContain("PartnerCallbackQueryParams");
    expect(spec).toContain("no PII");
    expect(spec).toContain("additionalProperties: false");
  });

  it("separates browser session, passport handoff, and public receipt tags", () => {
    expect(spec).toContain("name: BrowserSession");
    expect(spec).toContain("name: PassportHandoff");
    expect(spec).toContain("name: PublicReceipt");
    expect(spec).toContain("BrowserSession:");
    expect(spec).toContain("abraxas_browser_session");
  });

  it("docs hub links to partner-flow-api page", () => {
    const developer = DOCS_HUB_GROUPS.find((g) => g.id === "developer");
    const api = developer?.topics.find((t) => t.id === "api");
    expect(api?.links?.some((l) => l.href === "/docs/partner-flow-api")).toBe(true);
  });

  it("partner-flow-api docs page references OpenAPI spec and canonical host", () => {
    const page = readFileSync(
      join(process.cwd(), "app/docs/partner-flow-api/page.tsx"),
      "utf8",
    );
    expect(page).toContain("PARTNER_FLOW_OPENAPI_PUBLIC_PATH");
    expect(page).toContain("PARTNER_FLOW_OPENAPI_CANONICAL_URL");
    expect(page).toContain("abraxasworld.xyz");
    expect(page).not.toContain(STALE_HOST);
  });
});
