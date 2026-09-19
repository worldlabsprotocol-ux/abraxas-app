import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(process.cwd(), "supabase/migrations/089_circle_arc_testnet_settlement.sql");
const PANEL_PATH = resolve(process.cwd(), "components/partner/launchpad/CircleSettlementLaunchpadPanel.tsx");
const CLIENT_PATH = resolve(process.cwd(), "lib/settlement/circle/client.server.ts");
const INDEX_PATH = resolve(process.cwd(), "lib/settlement/circle/index.ts");
const AUTH_SERVER_PATH = resolve(process.cwd(), "lib/settlement/circle/authenticated.server.ts");

describe("089_circle_arc_testnet_settlement migration contract", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("is Preview/DEMO-first and does not store secrets or raw payloads", () => {
    expect(sql).toContain("ocntwbxarpjeixdnzide");
    expect(sql).toContain("not a custodian");
    expect(sql).toContain("Never store Circle API keys");
    expect(sql).not.toContain("GRANT SELECT ON public.partner_settlement_intents TO anon");
    expect(sql).not.toMatch(/raw_payload/i);
    expect(sql).not.toMatch(/jsonb/i);
    expect(sql).not.toContain("wallet_address");
    expect(sql).not.toContain("destination_address");
    expect(sql).toContain("secret-shaped or raw payload value rejected");
  });

  it("keeps intents pending-capable and Arc testnet USDC only", () => {
    expect(sql).toContain("pending");
    expect(sql).toContain("cancelled");
    expect(sql).toContain("ARC-TESTNET");
    expect(sql).toContain("USDC");
    expect(sql).toContain("amount_minor");
    expect(sql).toContain("idempotency_key uuid not null");
    expect(sql).toContain("unique (idempotency_key)");
    expect(sql).toContain("receipt_id");
    expect(sql).toContain("INITIATED");
    expect(sql).toContain("COMPLETE");
  });

  it("makes terminal settled/failed/cancelled rows immutable", () => {
    expect(sql).toContain("terminal intents are immutable");
    expect(sql).toContain("identity columns are immutable");
    expect(sql).toContain("old.state in ('settled', 'failed', 'cancelled')");
  });

  it("grants service_role only", () => {
    expect(sql.toLowerCase()).toContain("grant select, insert, update on public.partner_settlement_intents to service_role");
    expect(sql.toLowerCase()).toContain("revoke all on public.partner_settlement_intents from public, anon, authenticated");
  });
});

describe("090_circle_settlement_selection_replay migration contract", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/090_circle_settlement_selection_replay.sql"),
    "utf8",
  );

  it("is DEMO-first, hashed-jti only, and service_role only", () => {
    expect(sql).toContain("ocntwbxarpjeixdnzide");
    expect(sql).toContain("selection_jti_hash");
    expect(sql).toContain("SHA-256 hex");
    expect(sql).toContain("Never store the raw token");
    expect(sql).toContain("partner_settlement_intents_selection_jti_hash_unique");
    expect(sql).toContain("partner_settlement_intents_receipt_unique");
    expect(sql).not.toContain("selection_token");
    expect(sql).not.toMatch(/jsonb/i);
    expect(sql.toLowerCase()).toContain("revoke all on public.partner_settlement_intents from public, anon, authenticated");
    expect(sql.toLowerCase()).toContain("grant select, insert, update on public.partner_settlement_intents to service_role");
  });
});

describe("Circle client bundle boundary", () => {
  it("keeps the Circle client and sealing helpers server-only", async () => {
    const client = readFileSync(CLIENT_PATH, "utf8");
    const panel = readFileSync(PANEL_PATH, "utf8");
    const index = readFileSync(INDEX_PATH, "utf8");
    const authServer = readFileSync(AUTH_SERVER_PATH, "utf8");
    expect(client).toContain("server-only");
    expect(authServer).toContain("server-only");
    expect(authServer).toContain("sealCircleAuthenticatedResult");
    expect(index).not.toContain("sealCircleAuthenticatedResult");
    expect(panel).not.toContain("CIRCLE_API_KEY");
    expect(panel).not.toContain("entitySecret");
    expect(panel).not.toContain("client.server");
    expect(panel).not.toContain("wallet_address");
    expect(panel).not.toContain("demo-arc-settlement-1");
    expect(panel).not.toContain("setIdempotencyKey");
  });
});
