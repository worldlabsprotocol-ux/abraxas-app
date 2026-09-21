import { beforeEach, describe, expect, it, vi } from "vitest";

const tables = new Set<string>();
const activity: Record<string, unknown>[] = [];
const proposals: Record<string, unknown>[] = [];
const candidates: Record<string, unknown>[] = [];

function chain(table: string) {
  tables.add(table);
  const state: {
    filters: Record<string, unknown>;
    neq?: { key: string; value: unknown };
    insertRow?: Record<string, unknown>;
  } = { filters: {} };

  const api: Record<string, unknown> = {
    select: () => api,
    eq: (key: string, value: unknown) => {
      state.filters[key] = value;
      return api;
    },
    neq: (key: string, value: unknown) => {
      state.neq = { key, value };
      return api;
    },
    order: () => api,
    limit: () => api,
    maybeSingle: async () => {
      if (table === "partner_launchpad_applications") {
        return { data: { id: "app-1" }, error: null };
      }
      if (table === "partner_policy_proposals") {
        const row = proposals.find((item) => !state.filters.id || item.id === state.filters.id);
        return { data: row ?? null, error: null };
      }
      const row = candidates.find((item) => {
        const proposalOk = !state.filters.proposal_id || item.proposal_id === state.filters.proposal_id;
        const hashOk = !state.filters.shape_hash || item.shape_hash === state.filters.shape_hash;
        const idOk = !state.filters.id || item.id === state.filters.id;
        const neqOk = !state.neq || item[state.neq.key] !== state.neq.value;
        return proposalOk && hashOk && idOk && neqOk;
      });
      return { data: row ?? null, error: null };
    },
    insert: (row: Record<string, unknown>) => {
      if (table === "partner_launchpad_activity") {
        activity.push(row);
        return { then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }) };
      }
      const next = { id: "rc-1", operator_note: null, ...row };
      candidates.push(next);
      return {
        select: () => ({
          single: async () => ({ data: next, error: null }),
        }),
      };
    },
    update: (row: Record<string, unknown>) => ({
      eq: () => ({
        eq: () => ({
          select: () => ({
            single: async () => {
              const existing = candidates.find((item) => item.id === state.filters.id) ?? candidates[0];
              Object.assign(existing, row);
              return { data: existing, error: null };
            },
          }),
        }),
      }),
    }),
  };
  return api;
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => chain(table),
  }),
  SupabaseAdminConfigurationError: class extends Error {},
}));

import { createReleaseCandidate, decideReleaseCandidate } from "./store";

const body = {
  confirm: true,
  action: "retail_access",
  result_category: "age_21",
  shared_result: ["eligibility_result"],
  withheld: ["date_of_birth", "holder_wallet"],
  method_category: "reuse_existing_proof",
  minimum_assurance: "L1",
  environment: "sandbox",
  action_scopes: ["sandbox:protocol_access"],
  disclosure_profile: "result_only",
  compatibility_impact: "policy_review",
  policy_label: "reviewed_gate_age_21",
};

describe("policy release candidate store", () => {
  beforeEach(() => {
    tables.clear();
    activity.length = 0;
    proposals.length = 0;
    candidates.length = 0;
    proposals.push({
      id: "prop-1",
      partner_id: "acme",
      status: "accepted_for_policy_work",
      payload: {
        action: "retail_access",
        result_needed: "age_21",
        partner_receives: ["eligibility_result"],
        stays_private: ["date_of_birth", "holder_wallet"],
        environment: "sandbox",
        platform: "http_generic",
        capabilities: [],
      },
    });
  });

  it("requires an accepted proposal and isolates the originating tenant", async () => {
    proposals[0].status = "submitted";
    const denied = await createReleaseCandidate({ proposalId: "prop-1", body, confirm: true });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.code).toBe("accepted_proposal_required");

    proposals[0].status = "accepted_for_policy_work";
    const created = await createReleaseCandidate({ proposalId: "prop-1", body, confirm: true });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.item.partner_ref).not.toContain("acme");
    expect(created.item.candidate_ref.startsWith("prc_")).toBe(true);
    expect(candidates[0]?.partner_id).toBe("acme");
  });

  it("creates, replays, and transitions without mutating catalog or execution stores", async () => {
    const first = await createReleaseCandidate({ proposalId: "prop-1", body, confirm: true });
    expect(first.ok).toBe(true);
    const replay = await createReleaseCandidate({ proposalId: "prop-1", body, confirm: true });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.item.replay).toBe(true);
    expect(candidates).toHaveLength(1);

    const ready = await decideReleaseCandidate({
      candidateId: "rc-1",
      body: { status: "ready_for_review", confirm: true },
      confirm: true,
    });
    expect(ready.ok).toBe(true);
    const approved = await decideReleaseCandidate({
      candidateId: "rc-1",
      body: { status: "approved_for_catalog_pr", confirm: true },
      confirm: true,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.item.status).toBe("approved_for_catalog_pr");
    expect(approved.item.publishes_catalog).toBe(false);
    expect(approved.item.mints_receipt).toBe(false);
    const again = await decideReleaseCandidate({
      candidateId: "rc-1",
      body: { status: "approved_for_catalog_pr", confirm: true },
      confirm: true,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.replay).toBe(true);

    expect(tables.has("partner_policies")).toBe(false);
    expect(tables.has("policy_packs")).toBe(false);
    expect(tables.has("policy_compatibility_edges")).toBe(false);
    expect(tables.has("decision_receipts")).toBe(false);
    expect(tables.has("wallet_bindings")).toBe(false);
    expect(tables.has("partner_api_keys")).toBe(false);
    expect(tables.has("partner_settlement_intents")).toBe(false);
  });
});
