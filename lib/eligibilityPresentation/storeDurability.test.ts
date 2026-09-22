import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EligibilityPresentationRecord } from "./types";

const durable = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  unavailable: false,
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "eligibility_presentations") throw new Error("unexpected_table");
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      let patch: Record<string, unknown> | null = null;
      const execute = () => {
        if (durable.unavailable) return { data: null, error: { code: "42P01", message: "unavailable" } };
        const matches = Array.from(durable.rows.values()).filter((row) => filters.every((check) => check(row)));
        if (patch) {
          for (const row of matches) durable.rows.set(String(row.presentation_ref), { ...row, ...patch });
          return { data: matches.map((row) => durable.rows.get(String(row.presentation_ref))), error: null };
        }
        return { data: matches, error: null };
      };
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters.push((row: Record<string, unknown>) => row[key] === value);
          return query;
        },
        is: (key: string, value: unknown) => {
          filters.push((row: Record<string, unknown>) => row[key] === value);
          return query;
        },
        gt: (key: string, value: string) => {
          filters.push((row: Record<string, unknown>) => String(row[key]) > value);
          return query;
        },
        update: (value: Record<string, unknown>) => {
          patch = value;
          return query;
        },
        upsert: async (row: Record<string, unknown>) => {
          if (durable.unavailable) return { error: { code: "42P01", message: "unavailable" } };
          durable.rows.set(String(row.presentation_ref), row);
          return { error: null };
        },
        maybeSingle: async () => {
          const selected = execute();
          return { ...selected, data: selected.data?.[0] ?? null };
        },
        then: (resolve: (value: ReturnType<typeof execute>) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(execute()).then(resolve, reject),
      };
      return query;
    },
  }),
}));

import {
  consumePresentationIfIssued,
  loadPresentation,
  resetEligibilityPresentationsForTests,
  revokePresentationsForOrganization,
  revokePresentationsForReceipt,
  savePresentation,
} from "./store";

const originalVitest = process.env.VITEST;

function record(): EligibilityPresentationRecord {
  return {
    presentation_ref: "epr_durable_1",
    request_ref: "req_durable_1",
    partner_hmac: "partner_hmac_1",
    audience_hash: "audience_1",
    policy_id: "sandbox_institutional_protocol_access",
    policy_version: 1,
    action: "activate_protocol_access",
    action_scope: "sandbox:protocol_access",
    environment: "sandbox",
    result_category: "organization_eligible",
    nonce_hash: "nonce_hash_1",
    receipt_verification_ref: "dr_durable_1",
    signing_key_id: "key_1",
    payload_hash: "payload_hash_1",
    signature: "signature_1",
    status: "issued",
    issued_at: "2026-09-22T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    consumed_at: null,
    revoked_at: null,
    consent_bound: true,
  };
}

describe("presentation durable consume", () => {
  beforeEach(() => {
    process.env.VITEST = "";
    durable.rows.clear();
    durable.unavailable = false;
    resetEligibilityPresentationsForTests();
  });

  afterEach(() => {
    process.env.VITEST = originalVitest;
    durable.rows.clear();
    durable.unavailable = false;
    resetEligibilityPresentationsForTests();
  });

  it("consumes one row across concurrent workers after memory is cleared", async () => {
    await savePresentation(record());
    resetEligibilityPresentationsForTests();
    const consumedAt = new Date().toISOString();
    const results = await Promise.all([
      consumePresentationIfIssued({ presentationRef: "epr_durable_1", nonceHash: "nonce_hash_1", consumedAt }),
      consumePresentationIfIssued({ presentationRef: "epr_durable_1", nonceHash: "nonce_hash_1", consumedAt }),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect((await loadPresentation("epr_durable_1"))?.status).toBe("consumed");
  });

  it("reads revocation from durable state and refuses a later consume", async () => {
    await savePresentation(record());
    expect((await loadPresentation("epr_durable_1"))?.status).toBe("issued");
    await revokePresentationsForReceipt("dr_durable_1");
    expect((await loadPresentation("epr_durable_1"))?.status).toBe("revoked");
    expect(await consumePresentationIfIssued({
      presentationRef: "epr_durable_1",
      nonceHash: "nonce_hash_1",
      consumedAt: new Date().toISOString(),
    })).toBe(false);
  });

  it("persists organization-triggered revocation across workers", async () => {
    await savePresentation(record());
    resetEligibilityPresentationsForTests();
    await revokePresentationsForOrganization({
      partnerHmac: "partner_hmac_1",
      result_category: "organization_eligible",
      policy_id: "sandbox_institutional_protocol_access",
    });
    expect((await loadPresentation("epr_durable_1"))?.status).toBe("revoked");
  });

  it("fails closed when the durable store is unavailable", async () => {
    await savePresentation(record());
    durable.unavailable = true;
    await expect(loadPresentation("epr_durable_1")).rejects.toMatchObject({ code: "schema_unavailable" });
    await expect(consumePresentationIfIssued({
      presentationRef: "epr_durable_1",
      nonceHash: "nonce_hash_1",
      consumedAt: new Date().toISOString(),
    })).rejects.toMatchObject({ code: "schema_unavailable" });
  });
});
