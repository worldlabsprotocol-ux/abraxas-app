import { describe, expect, it } from "vitest";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import { CIRCLE_CURRENCY, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import { hashEligibleReceiptSelectionJti } from "@/lib/settlement/circle/eligibleReceiptSelection";
import { insertPendingIntent, toSafeEvidence, type SettlementIntentRow } from "@/lib/settlement/circle/store";

const HASH = hashEligibleReceiptSelectionJti("jti-1");
const OTHER_HASH = hashEligibleReceiptSelectionJti("jti-2");

function row(overrides: Partial<SettlementIntentRow> = {}): SettlementIntentRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    application_id: "app-1",
    partner_id: "acme",
    idempotency_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    state: "pending",
    network: CIRCLE_NETWORK,
    currency: CIRCLE_CURRENCY,
    amount_minor: 10_000,
    receipt_id: "receipt-1",
    selection_jti_hash: HASH,
    policy_id: "policy-1",
    policy_version: 1,
    provider_request_ref: null,
    circle_transaction_id: null,
    provider_state: null,
    provider_occurred_at: null,
    infrastructure_label: "DEMO/testnet settlement wallet — test infrastructure only",
    created_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
    ...overrides,
  };
}

function client(mode: "empty" | "by-hash" | "by-receipt" | "schema-missing" | "unique-then-hash") {
  const stored = row();
  let inserts = 0;
  return {
    from() {
      const filters: Record<string, string> = {};
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (column: string, value: string) => {
          filters[column] = value;
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        insert: (payload: Record<string, unknown>) => {
          expect(JSON.stringify(payload)).not.toMatch(/eyj|selection_token/i);
          expect(String(payload.selection_jti_hash)).toMatch(/^[a-f0-9]{64}$/);
          inserts += 1;
          if (mode === "unique-then-hash") {
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { code: "23505", message: "partner_settlement_intents_selection_jti_hash_unique" },
                }),
              }),
            };
          }
          return {
            select: () => ({
              maybeSingle: async () => ({ data: stored, error: null }),
            }),
          };
        },
        maybeSingle: async () => {
          if (mode === "schema-missing" && filters.selection_jti_hash) {
            return { data: null, error: { code: "PGRST204", message: "Could not find the column" } };
          }
          if (filters.selection_jti_hash) {
            if (mode === "by-hash" || (mode === "unique-then-hash" && inserts > 0)) {
              return { data: stored, error: null };
            }
            return { data: null, error: null };
          }
          if (filters.receipt_id && mode === "by-receipt") {
            return { data: stored, error: null };
          }
          return { data: null, error: null };
        },
      };
      return builder;
    },
  };
}

const baseInput = {
  applicationId: "app-1",
  partnerId: "acme",
  amountMinor: 10_000,
  receiptId: "receipt-1",
  policyId: "policy-1",
  policyVersion: 1,
  selectionJtiHash: HASH,
};

describe("insertPendingIntent durable replay", () => {
  it("inserts once then returns the same row for same-hash replay", async () => {
    const first = await insertPendingIntent({
      ...baseInput,
      client: client("empty") as never,
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.duplicate).toBe(false);
      expect(first.replay).toBe(false);
    }

    const replay = await insertPendingIntent({
      ...baseInput,
      client: client("by-hash") as never,
    });
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.duplicate).toBe(true);
      expect(replay.replay).toBe(true);
      expect(replay.row.id).toBe(row().id);
    }
  });

  it("treats concurrent unique violations as cross-instance replay of one row", async () => {
    const recovered = await insertPendingIntent({
      ...baseInput,
      client: client("unique-then-hash") as never,
    });
    expect(recovered.ok).toBe(true);
    if (recovered.ok) {
      expect(recovered.duplicate).toBe(true);
      expect(recovered.replay).toBe(true);
      expect(recovered.row.id).toBe(row().id);
    }
  });

  it("reuses one receipt-bound row for a different token hash", async () => {
    const result = await insertPendingIntent({
      ...baseInput,
      selectionJtiHash: OTHER_HASH,
      client: client("by-receipt") as never,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate).toBe(true);
      expect(result.replay).toBe(false);
    }
  });

  it("fails closed when the hashed jti column is missing", async () => {
    const result = await insertPendingIntent({
      ...baseInput,
      client: client("schema-missing") as never,
    });
    expect(result).toEqual({ ok: false, code: CIRCLE_PUBLIC_CODES.schema_unavailable });
  });

  it("omits selection_jti_hash from safe evidence", async () => {
    const evidence = toSafeEvidence(row());
    expect(JSON.stringify(evidence)).not.toContain("selection_jti_hash");
    expect("selection_jti_hash" in evidence).toBe(false);
  });
});
