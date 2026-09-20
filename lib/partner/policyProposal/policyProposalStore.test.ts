import { beforeEach, describe, expect, it, vi } from "vitest";

const tables = new Set<string>();
const activity: Record<string, unknown>[] = [];
const proposals: Record<string, unknown>[] = [];

function chain(table: string) {
  tables.add(table);
  const state: {
    filters: Record<string, unknown>;
    inStatus?: string[];
    insertRow?: Record<string, unknown>;
    updateRow?: Record<string, unknown>;
  } = { filters: {} };

  const api: Record<string, unknown> = {
    select: () => api,
    eq: (key: string, value: unknown) => {
      state.filters[key] = value;
      return api;
    },
    in: (key: string, values: string[]) => {
      if (key === "status") state.inStatus = values;
      return api;
    },
    order: () => api,
    limit: () => api,
    maybeSingle: async () => {
      if (table === "partner_launchpad_applications") {
        return { data: { id: "app-1" }, error: null };
      }
      const row = proposals.find((item) => {
        const partnerOk = !state.filters.partner_id || item.partner_id === state.filters.partner_id;
        const hashOk = !state.filters.payload_hash || item.payload_hash === state.filters.payload_hash;
        const idOk = !state.filters.id || item.id === state.filters.id;
        const statusOk = !state.inStatus || state.inStatus.includes(String(item.status));
        return partnerOk && hashOk && idOk && statusOk;
      });
      return { data: row ?? null, error: null };
    },
    insert: (row: Record<string, unknown>) => {
      if (table === "partner_launchpad_activity") {
        activity.push(row);
        return { then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }) };
      }
      const next = {
        id: "prop-1",
        operator_note: null,
        planning: null,
        ...row,
      };
      state.insertRow = next;
      proposals.push(next);
      return {
        select: () => ({
          single: async () => ({ data: next, error: null }),
        }),
      };
    },
    update: (row: Record<string, unknown>) => {
      state.updateRow = row;
      return {
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => {
                const existing = proposals.find((item) => item.id === state.filters.id) ?? proposals[0];
                Object.assign(existing, row);
                return { data: existing, error: null };
              },
            }),
          }),
        }),
      };
    },
  };
  return api;
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => chain(table),
  }),
  SupabaseAdminConfigurationError: class extends Error {},
}));

import { decidePolicyProposal, listPartnerProposals, submitPolicyProposal } from "./store";
import { sanitizeProposalPayload } from "./sanitize";

const body = {
  action: "retail_access",
  result_needed: "age_21",
  partner_receives: ["eligibility_result"],
  stays_private: ["date_of_birth", "holder_wallet"],
  environment: "sandbox",
  platform: "http_generic",
  capabilities: ["reusable_result"],
  confirm: true,
};

describe("policy proposal store", () => {
  beforeEach(() => {
    tables.clear();
    activity.length = 0;
    proposals.length = 0;
  });

  it("creates a submitted proposal for the session tenant and replays the same hash", async () => {
    const first = await submitPolicyProposal({ partnerId: "acme", body, confirm: true });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.item.status).toBe("submitted");
    expect(first.item.creates_policy).toBe(false);
    expect(first.item.publishes_catalog).toBe(false);
    expect(first.item.activates_mainnet).toBe(false);
    expect(first.item.proposal_ref.startsWith("ppr_")).toBe(true);
    expect(proposals[0]?.partner_id).toBe("acme");
    expect(sanitizeProposalPayload(first.item.payload)).toEqual(first.item.payload);

    const replay = await submitPolicyProposal({ partnerId: "acme", body, confirm: true });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.item.replay).toBe(true);
    expect(proposals).toHaveLength(1);
    expect(activity.some((row) => row.event_type === "policy_proposal_submitted")).toBe(true);
  });

  it("isolates tenants so another partner cannot list or replay the first proposal", async () => {
    await submitPolicyProposal({ partnerId: "acme", body, confirm: true });
    const other = await listPartnerProposals("other");
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(other.items).toHaveLength(0);

    const otherSubmit = await submitPolicyProposal({ partnerId: "other", body, confirm: true });
    expect(otherSubmit.ok).toBe(true);
    if (!otherSubmit.ok) return;
    expect(otherSubmit.item.replay).toBeUndefined();
    expect(proposals).toHaveLength(2);
  });

  it("accepts for policy work with an operator planning record and is idempotent", async () => {
    await submitPolicyProposal({ partnerId: "acme", body, confirm: true });
    const decided = await decidePolicyProposal({
      proposalId: "prop-1",
      body: { status: "accepted_for_policy_work", confirm: true, remediation: "Need catalog review" },
      confirm: true,
    });
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.replay).toBe(false);
    expect(decided.item.planning?.live_policy).toBe(false);
    expect(decided.item.planning?.publishes_catalog).toBe(false);
    expect(decided.item.planning?.mutates_compatibility_edge).toBe(false);

    const replay = await decidePolicyProposal({
      proposalId: "prop-1",
      body: { status: "accepted_for_policy_work", confirm: true },
      confirm: true,
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.replay).toBe(true);

    expect(tables.has("partner_policies")).toBe(false);
    expect(tables.has("policy_packs")).toBe(false);
    expect(tables.has("policy_compatibility_edges")).toBe(false);
    expect(tables.has("decision_receipts")).toBe(false);
    expect(tables.has("wallet_bindings")).toBe(false);
    expect(tables.has("partner_api_keys")).toBe(false);
    expect(tables.has("partner_settlement_intents")).toBe(false);
  });
});
