// FILE: lib/partner/billing/migration109.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("109 partner Solana USDC billing migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/109_partner_solana_usdc_billing.sql"),
    "utf8",
  );

  it("keeps intents service-role-only and confirms entitlement atomically", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("confirm_partner_solana_billing_intent");
    expect(sql).toContain("for update");
    expect(sql).toContain("paid_through");
    expect(sql).toContain("interval '30 days'");
    expect(sql).toContain("grant execute");
    expect(sql).toContain("service_role");
  });

  it("stores no wallet secrets and never adds a send path", () => {
    expect(sql).not.toMatch(/private_key|secret_key|seed_phrase|mnemonic/i);
    expect(sql).not.toMatch(/send_transaction|sign_transaction/i);
  });
});
