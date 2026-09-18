import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(process.cwd(), "supabase/migrations/089_circle_arc_testnet_settlement.sql");
const PANEL_PATH = resolve(process.cwd(), "components/partner/launchpad/CircleSettlementLaunchpadPanel.tsx");
const CLIENT_PATH = resolve(process.cwd(), "lib/settlement/circle/client.server.ts");

describe("089_circle_arc_testnet_settlement migration contract", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("is Preview/DEMO-first and does not store secrets", () => {
    expect(sql).toContain("ocntwbxarpjeixdnzide");
    expect(sql).toContain("not a custodian");
    expect(sql).toContain("Never store Circle API keys");
    expect(sql).not.toContain("GRANT SELECT ON public.partner_settlement_intents TO anon");
  });

  it("keeps intents pending-capable and Arc testnet USDC only", () => {
    expect(sql).toContain("pending");
    expect(sql).toContain("ARC-TESTNET");
    expect(sql).toContain("USDC");
    expect(sql).toContain("amount_minor");
    expect(sql).toContain("idempotency_key");
    expect(sql).toContain("receipt_id");
  });

  it("grants service_role only", () => {
    expect(sql.toLowerCase()).toContain("grant select, insert, update on public.partner_settlement_intents to service_role");
    expect(sql.toLowerCase()).toContain("revoke all on public.partner_settlement_intents from public, anon, authenticated");
  });
});

describe("Circle client bundle boundary", () => {
  it("keeps the Circle client server-only and out of the Launchpad panel", () => {
    const client = readFileSync(CLIENT_PATH, "utf8");
    const panel = readFileSync(PANEL_PATH, "utf8");
    expect(client).toContain("server-only");
    expect(panel).not.toContain("CIRCLE_API_KEY");
    expect(panel).not.toContain("entitySecret");
    expect(panel).not.toContain("client.server");
    expect(panel).not.toContain("wallet_address");
  });
});
