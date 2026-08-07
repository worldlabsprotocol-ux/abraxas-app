// FILE: lib/docs/x402ArchitectureDocs.test.ts
// Documentation structure guards for x402 + Abraxas design docs.

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function readDoc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("x402 architecture documentation", () => {
  const architecture = readDoc("docs/X402_ABRAXAS_ARCHITECTURE.md");
  const threatModel = readDoc("docs/X402_THREAT_MODEL.md");

  it("architecture doc defines both products and recommends Product B MVP", () => {
    expect(architecture).toContain("Product A — Abraxas-paid APIs");
    expect(architecture).toContain("Product B — Partner-paid gated access");
    expect(architecture).toMatch(/Recommended MVP: Product B/i);
  });

  it("architecture doc specifies x402 v2 headers", () => {
    expect(architecture).toContain("PAYMENT-REQUIRED");
    expect(architecture).toContain("PAYMENT-SIGNATURE");
    expect(architecture).toContain("PAYMENT-RESPONSE");
    expect(architecture).toContain("x402Version: 2");
    expect(architecture).toMatch(/Do not mix v1/i);
  });

  it("architecture doc covers idempotency, settlement failure, and audit without PII", () => {
    expect(architecture).toMatch(/idempotency/i);
    expect(architecture).toMatch(/ambiguous/i);
    expect(architecture).toMatch(/no PII/i);
    expect(architecture).toContain("validatePartnerFlowPublicReceipt");
  });

  it("architecture doc includes phased roadmap and operator decisions", () => {
    expect(architecture).toMatch(/Phase 0/i);
    expect(architecture).toMatch(/Testnet pilot/i);
    expect(architecture).toMatch(/Production gate/i);
    expect(architecture).toContain("Infrastructure and operator decisions");
  });

  it("architecture doc forbids pay-to-pass and Abraxas custody in MVP", () => {
    expect(architecture).toMatch(/pay.to.pass|pay-to-pass/i);
    expect(architecture).toMatch(/no Abraxas custody|No Abraxas custody/i);
  });

  it("threat model covers critical threats and security requirements", () => {
    expect(threatModel).toContain("T1 — Pay to pass verification");
    expect(threatModel).toContain("T3 — Payment replay");
    expect(threatModel).toContain("SR-1");
    expect(threatModel).toContain("SR-4");
  });

  it("reference gateway README is testnet-only and documents safety contract", () => {
    const readme = readDoc("examples/x402-partner-flow-gateway/README.md");
    expect(readme).toMatch(/TESTNET \/ DEMO ONLY/i);
    expect(readme).toContain("eip155:84532");
    expect(readme).toMatch(/idempotenc/i);
    expect(readme).toMatch(/local-demo only/i);
    expect(readme).toMatch(/serverless/i);
    expect(readme).toContain("```mermaid");
  });
});
