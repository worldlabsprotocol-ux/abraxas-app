// FILE: lib/admin/partnerSandboxSignoff.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  anyWebhookGateAcknowledged,
  applyChecklistCasFilter,
  applySandboxSignoffCasUpdate,
  buildDesignPartnerPatchPayload,
  buildNextChecklist,
  defaultSandboxPilotSignoff,
  defaultWebhookTrackGates,
  describeChecklistCasFilter,
  findForbiddenClientChecklistField,
  mergeSignoffPatch,
  readSandboxPilotSignoff,
  serializeChecklistCasFilterForPostgrest,
  splitPriorChecklist,
  validateEvidenceValue,
  validateGateDependencies,
  validateWebhookEventIdBinding,
  webhookEventIdChangeBlocked,
} from "@/lib/admin/partnerSandboxSignoff";

const SAMPLE_EVENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_EVENT_ID = "22222222-2222-4222-8222-222222222222";

function webhookPatch(
  gates: Partial<{
    queued: boolean;
    http_delivered: boolean;
    signature_verified: boolean;
    signature_manual: boolean;
  }>,
  eventId = SAMPLE_EVENT_ID,
) {
  return {
    evidence: { event_id: eventId },
    gates: {
      webhook_track: {
        ...(gates.queued !== undefined ? { queued: { operator_ack: gates.queued } } : {}),
        ...(gates.http_delivered !== undefined ? { http_delivered: { operator_ack: gates.http_delivered } } : {}),
        ...(gates.signature_verified !== undefined
          ? {
              signature_verified_by_receiver: {
                operator_ack: gates.signature_verified,
                ...(gates.signature_manual ? { manual_partner_confirmation: true } : {}),
              },
            }
          : {}),
      },
    },
  };
}

describe("partnerSandboxSignoff", () => {
  it("preserves unrelated top-level checklist keys on merge", () => {
    const prior = { future_key: 1, sandbox_pilot_signoff: defaultSandboxPilotSignoff("app-1") };
    const nextSignoff = mergeSignoffPatch(
      prior.sandbox_pilot_signoff as ReturnType<typeof defaultSandboxPilotSignoff>,
      { gates: { configured: { operator_ack: true } } },
      "app-1",
    );
    const merged = buildNextChecklist(prior, nextSignoff);
    expect(merged.future_key).toBe(1);
    expect((merged.sandbox_pilot_signoff as { gates: { configured: { operator_ack: boolean } } }).gates.configured.operator_ack).toBe(true);
  });

  it("rejects partner_verified without manual_partner_confirmation", () => {
    const prior = defaultSandboxPilotSignoff("app-1");
    expect(() =>
      mergeSignoffPatch(prior, { gates: { partner_verified: { operator_ack: true } } }, "app-1"),
    ).toThrow("manual_partner_confirmation_required");
  });

  it("does not auto-set partner_verified from receipt_id evidence", () => {
    const prior = defaultSandboxPilotSignoff("app-1");
    const next = mergeSignoffPatch(
      prior,
      { evidence: { receipt_id: "dr_sandbox_example_001" } },
      "app-1",
    );
    expect(next.gates.partner_verified.operator_ack).toBe(false);
    expect(next.evidence.receipt_id).toBe("dr_sandbox_example_001");
  });

  it("requires prior gates before pilot continuation", () => {
    const prior = defaultSandboxPilotSignoff("app-1");
    expect(() =>
      mergeSignoffPatch(
        prior,
        { gates: { approved_for_pilot_continuation: { operator_ack: true } } },
        "app-1",
      ),
    ).toThrow("pilot_continuation_requires_prior_gates");
  });

  it("rejects secret-like evidence values", () => {
    expect(validateEvidenceValue("receipt_id", "abx_test_secretvalue")).toMatch(/secrets/);
    expect(validateEvidenceValue("event_id", "whsec_abc")).toMatch(/secrets/);
  });

  it("describeChecklistCasFilter uses is.null for SQL NULL", () => {
    expect(describeChecklistCasFilter(null)).toEqual({
      kind: "is",
      column: "onboarding_checklist",
      value: null,
    });
  });

  it("describeChecklistCasFilter uses eq for non-null JSONB", () => {
    const raw = { other: 1 };
    expect(describeChecklistCasFilter(raw)).toEqual({
      kind: "eq",
      column: "onboarding_checklist",
      value: raw,
    });
  });

  it("serializeChecklistCasFilterForPostgrest encodes JSONB equality", () => {
    const raw = { other: 1 };
    expect(serializeChecklistCasFilterForPostgrest(describeChecklistCasFilter(raw))).toBe(
      `onboarding_checklist=eq.${encodeURIComponent(JSON.stringify(raw))}`,
    );
    expect(serializeChecklistCasFilterForPostgrest(describeChecklistCasFilter(null))).toBe(
      "onboarding_checklist=is.null",
    );
  });

  it("applyChecklistCasFilter routes to is or eq", () => {
    const calls: string[] = [];
    const query = {
      eq: (col: string, val: unknown) => {
        calls.push(`eq:${col}:${typeof val === "string" ? val : JSON.stringify(val)}`);
        return query;
      },
      is: (col: string, val: null) => {
        calls.push(`is:${col}:${String(val)}`);
        return query;
      },
    };
    applyChecklistCasFilter(query, describeChecklistCasFilter(null));
    expect(calls).toEqual(["is:onboarding_checklist:null"]);
    const raw = { a: 1 };
    applyChecklistCasFilter(query, describeChecklistCasFilter(raw));
    expect(calls[1]).toBe(`eq:onboarding_checklist:${JSON.stringify(raw)}`);
  });

  it("applySandboxSignoffCasUpdate returns conflict when no row updated", async () => {
    const result = await applySandboxSignoffCasUpdate(
      async () => null,
      null,
      {},
      { sandbox_pilot_signoff: defaultSandboxPilotSignoff("app-1") },
    );
    expect(result).toEqual({ ok: false, code: "checklist_conflict" });
  });

  it("splitPriorChecklist preserves raw null separately from merge object", () => {
    expect(splitPriorChecklist(null)).toEqual({ rawPriorChecklist: null, priorChecklist: {} });
    const raw = { x: 1 };
    expect(splitPriorChecklist(raw)).toEqual({ rawPriorChecklist: raw, priorChecklist: { x: 1 } });
  });

  it("readSandboxPilotSignoff returns default when missing", () => {
    const signoff = readSandboxPilotSignoff({}, "app-1");
    expect(signoff.application_id).toBe("app-1");
    expect(signoff.gates.configured.operator_ack).toBe(false);
  });

  it("findForbiddenClientChecklistField detects client CAS fields", () => {
    expect(findForbiddenClientChecklistField({ expected_onboarding_checklist: {} })).toBe(
      "expected_onboarding_checklist",
    );
  });

  it("buildDesignPartnerPatchPayload omits reviewer_notes when not present", () => {
    const payload = buildDesignPartnerPatchPayload({ id: "1", status: "approved" });
    expect(payload).not.toHaveProperty("reviewer_notes");
    expect(payload.status).toBe("approved");
  });

  it("buildDesignPartnerPatchPayload clears notes on empty string", () => {
    const payload = buildDesignPartnerPatchPayload({ id: "1", status: "approved", reviewer_notes: "" });
    expect(payload.reviewer_notes).toBeNull();
  });

  it("validateGateDependencies rejects signature without manual partner confirmation", () => {
    const signoff = defaultSandboxPilotSignoff("app-1");
    signoff.gates.webhook_track = {
      queued: { operator_ack: true, acknowledged_at: "t" },
      http_delivered: { operator_ack: true, acknowledged_at: "t" },
      signature_verified_by_receiver: { operator_ack: true, acknowledged_at: "t" },
    };
    signoff.evidence.event_id = SAMPLE_EVENT_ID;
    expect(() => validateGateDependencies(signoff)).toThrow("manual_partner_confirmation_required");
  });

  it("rejects queued webhook gate without event_id", () => {
    const prior = defaultSandboxPilotSignoff("app-1");
    expect(() =>
      mergeSignoffPatch(prior, { gates: { webhook_track: { queued: { operator_ack: true } } } }, "app-1"),
    ).toThrow("webhook_event_id_required");
  });

  it("rejects http_delivered webhook gate without event_id", () => {
    let prior = defaultSandboxPilotSignoff("app-1");
    prior = mergeSignoffPatch(
      prior,
      webhookPatch({ queued: true }),
      "app-1",
    );
    prior.evidence = {};
    expect(() =>
      mergeSignoffPatch(
        prior,
        {
          gates: {
            webhook_track: {
              queued: { operator_ack: true },
              http_delivered: { operator_ack: true },
            },
          },
        },
        "app-1",
      ),
    ).toThrow("webhook_event_id_required");
  });

  it("rejects signature webhook gate without event_id", () => {
    let prior = defaultSandboxPilotSignoff("app-1");
    prior = mergeSignoffPatch(prior, webhookPatch({ queued: true, http_delivered: true }), "app-1");
    prior.evidence = {};
    expect(() =>
      mergeSignoffPatch(
        prior,
        {
          gates: {
            webhook_track: {
              queued: { operator_ack: true },
              http_delivered: { operator_ack: true },
              signature_verified_by_receiver: {
                operator_ack: true,
                manual_partner_confirmation: true,
              },
            },
          },
        },
        "app-1",
      ),
    ).toThrow("webhook_event_id_required");
  });

  it("rejects changing event_id while webhook gates remain acknowledged", () => {
    let prior = defaultSandboxPilotSignoff("app-1");
    prior = mergeSignoffPatch(prior, webhookPatch({ queued: true }), "app-1");
    expect(() =>
      mergeSignoffPatch(
        prior,
        {
          evidence: { event_id: OTHER_EVENT_ID },
          gates: {
            webhook_track: {
              queued: { operator_ack: true },
            },
          },
        },
        "app-1",
      ),
    ).toThrow("webhook_event_change_requires_gate_reset");
  });

  it("allows changing event_id after all webhook gates are cleared", () => {
    let prior = defaultSandboxPilotSignoff("app-1");
    prior = mergeSignoffPatch(prior, webhookPatch({ queued: true }), "app-1");
    const cleared = mergeSignoffPatch(
      prior,
      {
        evidence: { event_id: OTHER_EVENT_ID },
        gates: {
          webhook_track: {
            queued: { operator_ack: false },
            http_delivered: { operator_ack: false },
            signature_verified_by_receiver: { operator_ack: false },
          },
        },
      },
      "app-1",
    );
    expect(cleared.evidence.event_id).toBe(OTHER_EVENT_ID);
    expect(cleared.gates.webhook_track?.queued.operator_ack).toBe(false);
  });

  it("allows progressive webhook acknowledgements with unchanged event_id", () => {
    let signoff = defaultSandboxPilotSignoff("app-1");
    signoff = mergeSignoffPatch(signoff, webhookPatch({ queued: true }), "app-1");
    signoff = mergeSignoffPatch(
      signoff,
      webhookPatch({ queued: true, http_delivered: true }),
      "app-1",
    );
    signoff = mergeSignoffPatch(
      signoff,
      webhookPatch({
        queued: true,
        http_delivered: true,
        signature_verified: true,
        signature_manual: true,
      }),
      "app-1",
    );
    expect(signoff.evidence.event_id).toBe(SAMPLE_EVENT_ID);
    expect(signoff.gates.webhook_track?.signature_verified_by_receiver.operator_ack).toBe(true);
  });

  it("event_id alone does not acknowledge webhook gates", () => {
    const prior = defaultSandboxPilotSignoff("app-1");
    const next = mergeSignoffPatch(prior, { evidence: { event_id: SAMPLE_EVENT_ID } }, "app-1");
    expect(next.evidence.event_id).toBe(SAMPLE_EVENT_ID);
    expect(anyWebhookGateAcknowledged(next.gates.webhook_track)).toBe(false);
  });

  it("rejects http_delivered without queued", () => {
    const prior = defaultSandboxPilotSignoff("app-1");
    expect(() =>
      mergeSignoffPatch(
        prior,
        webhookPatch({ http_delivered: true }),
        "app-1",
      ),
    ).toThrow("webhook_queued_required");
  });

  it("rejects signature verified without http_delivered", () => {
    const prior = defaultSandboxPilotSignoff("app-1");
    expect(() =>
      mergeSignoffPatch(
        prior,
        webhookPatch({ queued: true, signature_verified: true, signature_manual: true }),
        "app-1",
      ),
    ).toThrow("webhook_delivered_required");
  });

  it("http_delivered ack does not set signature verified", () => {
    const next = mergeSignoffPatch(
      defaultSandboxPilotSignoff("app-1"),
      webhookPatch({ queued: true, http_delivered: true }),
      "app-1",
    );
    expect(next.gates.webhook_track?.http_delivered.operator_ack).toBe(true);
    expect(next.gates.webhook_track?.signature_verified_by_receiver.operator_ack).toBe(false);
  });

  it("rejects invalid event_id format", () => {
    expect(validateEvidenceValue("event_id", "https://evil.example/event")).toMatch(/URLs/);
    expect(validateEvidenceValue("event_id", "bad id with spaces")).toMatch(/whitespace/);
    expect(validateEvidenceValue("event_id", "!!!invalid!!!")).toMatch(/safe event ID/);
  });

  it("webhookEventIdChangeBlocked detects blocked replacement", () => {
    const signoff = defaultSandboxPilotSignoff("app-1");
    signoff.gates.webhook_track = defaultWebhookTrackGates();
    signoff.gates.webhook_track.queued.operator_ack = true;
    signoff.evidence.event_id = SAMPLE_EVENT_ID;
    expect(webhookEventIdChangeBlocked(signoff, SAMPLE_EVENT_ID, OTHER_EVENT_ID)).toBe(true);
    expect(webhookEventIdChangeBlocked(signoff, SAMPLE_EVENT_ID, SAMPLE_EVENT_ID)).toBe(false);
  });

  it("validateWebhookEventIdBinding allows event change when gates cleared", () => {
    const prior = mergeSignoffPatch(
      defaultSandboxPilotSignoff("app-1"),
      webhookPatch({ queued: true }),
      "app-1",
    );
    const next = mergeSignoffPatch(
      prior,
      {
        evidence: { event_id: OTHER_EVENT_ID },
        gates: {
          webhook_track: {
            queued: { operator_ack: false },
            http_delivered: { operator_ack: false },
            signature_verified_by_receiver: { operator_ack: false },
          },
        },
      },
      "app-1",
    );
    expect(() => validateWebhookEventIdBinding(prior, next)).not.toThrow();
  });

  it("approved continuation does not require webhook track gates", () => {
    let signoff = defaultSandboxPilotSignoff("app-1");
    signoff = mergeSignoffPatch(signoff, { gates: { configured: { operator_ack: true } } }, "app-1");
    signoff = mergeSignoffPatch(signoff, { gates: { partner_flow_tested: { operator_ack: true } } }, "app-1");
    signoff = mergeSignoffPatch(
      signoff,
      { gates: { partner_verified: { operator_ack: true, manual_partner_confirmation: true } } },
      "app-1",
    );
    signoff = mergeSignoffPatch(
      signoff,
      { gates: { approved_for_pilot_continuation: { operator_ack: true } } },
      "app-1",
    );
    expect(anyWebhookGateAcknowledged(signoff.gates.webhook_track)).toBe(false);
    expect(signoff.gates.approved_for_pilot_continuation.operator_ack).toBe(true);
  });

  it("successful continuation requires configured, tested, and partner-verified gates", () => {
    let signoff = defaultSandboxPilotSignoff("app-1");
    signoff = mergeSignoffPatch(signoff, { gates: { configured: { operator_ack: true } } }, "app-1");
    signoff = mergeSignoffPatch(signoff, { gates: { partner_flow_tested: { operator_ack: true } } }, "app-1");
    signoff = mergeSignoffPatch(
      signoff,
      {
        gates: {
          partner_verified: { operator_ack: true, manual_partner_confirmation: true },
        },
      },
      "app-1",
    );
    signoff = mergeSignoffPatch(
      signoff,
      { gates: { approved_for_pilot_continuation: { operator_ack: true } } },
      "app-1",
    );
    expect(signoff.gates.approved_for_pilot_continuation.operator_ack).toBe(true);
  });

  it("applySandboxSignoffCasUpdate passes exact raw object to runUpdate filter", async () => {
    const raw = { other: 2 };
    const captured: unknown[] = [];
    await applySandboxSignoffCasUpdate(
      async (filter) => {
        captured.push(filter);
        return { updated_at: "2026-01-01T00:00:00.000Z" };
      },
      raw,
      { ...raw },
      { ...raw, sandbox_pilot_signoff: defaultSandboxPilotSignoff("app-1") },
    );
    expect(captured[0]).toEqual({ kind: "eq", column: "onboarding_checklist", value: raw });
  });

  it("applySandboxSignoffCasUpdate uses is filter for null raw checklist", async () => {
    const captured: unknown[] = [];
    await applySandboxSignoffCasUpdate(
      async (filter) => {
        captured.push(filter);
        return { updated_at: "2026-01-01T00:00:00.000Z" };
      },
      null,
      {},
      { sandbox_pilot_signoff: defaultSandboxPilotSignoff("app-1") },
    );
    expect(captured[0]).toEqual({ kind: "is", column: "onboarding_checklist", value: null });
  });
});

describe("partnerSandboxSignoff PostgREST URL serialization", () => {
  it("builds onboarding_checklist=is.null for SQL NULL CAS", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    let capturedUrl = "";
    const sb = createClient("https://example.supabase.co", "anon-key", {
      global: {
        fetch: (input) => {
          capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          return Promise.resolve(
            new Response(JSON.stringify({ partner_id: "acme", updated_at: "2026-01-01T00:00:00.000Z" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        },
      },
    });

    let query = sb.from("partners").update({ onboarding_checklist: { sandbox_pilot_signoff: {} } }).eq("partner_id", "acme");
    query = applyChecklistCasFilter(query, describeChecklistCasFilter(null));
    await query.select("partner_id, updated_at").maybeSingle();

    expect(capturedUrl).toContain("onboarding_checklist=is.null");
  });

  it("builds onboarding_checklist=eq.<json> for non-null JSONB CAS", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const raw = { future_key: 1 };
    let capturedUrl = "";
    const sb = createClient("https://example.supabase.co", "anon-key", {
      global: {
        fetch: (input) => {
          capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          return Promise.resolve(
            new Response(JSON.stringify({ partner_id: "acme", updated_at: "2026-01-01T00:00:00.000Z" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        },
      },
    });

    let query = sb.from("partners").update({ onboarding_checklist: { future_key: 1 } }).eq("partner_id", "acme");
    query = applyChecklistCasFilter(query, describeChecklistCasFilter(raw));
    await query.select("partner_id, updated_at").maybeSingle();

    expect(capturedUrl).toContain(`onboarding_checklist=eq.${encodeURIComponent(JSON.stringify(raw))}`);
  });
});
