import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("088 partner event delivery migration", () => {
  it("is DEMO labeled and expands public event types without dropping legacy types", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/088_partner_event_delivery_event_types.sql"),
      "utf8",
    );
    expect(sql).toMatch(/DEMO-ONLY/i);
    expect(sql).toContain("receipt.issued");
    expect(sql).toContain("receipt.expired");
    expect(sql).toContain("receipt.revoked");
    expect(sql).toContain("decision.denied");
    expect(sql).toContain("integration.health_changed");
    expect(sql).toContain("partner.receipt.issued");
    expect(sql).toContain("partner.webhook.test");
    expect(sql).toMatch(/Do not apply to MAIN or Production/i);
  });
});
