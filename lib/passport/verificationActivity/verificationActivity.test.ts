import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";
import {
  PASSPORT_ACTIVITY_CLIENT_ITEM_KEYS,
  PASSPORT_ACTIVITY_CLIENT_VIEW_KEYS,
  PASSPORT_ACTIVITY_EMPTY,
  PASSPORT_ACTIVITY_LIMIT,
  PASSPORT_ACTIVITY_NOTICE,
  PASSPORT_ACTIVITY_STATE_LABELS,
} from "@/lib/passport/verificationActivity/contract";
import {
  buildPassportActivityItem,
  buildPassportActivityView,
  opaqueActivityRef,
  passportActivityCopyLeaks,
  resolvePassportActivityState,
  safePurposeText,
  type PassportActivitySourceRow,
} from "@/lib/passport/verificationActivity/view";

const SUBJECT_A = "0x" + "a".repeat(64);
const SUBJECT_B = "0x" + "b".repeat(64);
const NOW = new Date("2026-09-20T12:00:00.000Z");

function row(overrides: Partial<PassportActivitySourceRow> = {}): PassportActivitySourceRow {
  return {
    decision_id: "dec-approved",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    policy_id: "partner-age_18_retail-v1",
    policy_version: 1,
    decision: "approved",
    decided_at: "2026-09-19T12:00:00.000Z",
    valid_until: "2026-09-21T12:00:00.000Z",
    decision_status: "active",
    requested_action: "Confirm adult retail eligibility",
    receipt_status: "active",
    receipt_context: "production",
    receipt_expires_at: "2026-09-21T12:00:00.000Z",
    receipt_revoked_at: null,
    ...overrides,
  };
}

describe("passport verification activity view", () => {
  it("returns empty history with notice and no items", () => {
    const view = buildPassportActivityView({ subjectId: SUBJECT_A, rows: [], now: NOW });
    expect(view.items).toEqual([]);
    expect(view.truncated).toBe(false);
    expect(view.notice).toBe(PASSPORT_ACTIVITY_NOTICE);
    expect(PASSPORT_ACTIVITY_EMPTY.toLowerCase()).toContain("no verification activity");
  });

  it("projects approved, denied, expired, revoked, and sandbox-only entries", () => {
    const view = buildPassportActivityView({
      subjectId: SUBJECT_A,
      now: NOW,
      rows: [
        row(),
        row({
          decision_id: "dec-denied",
          decision: "denied",
          receipt_status: "active",
          valid_until: "2026-09-21T12:00:00.000Z",
        }),
        row({
          decision_id: "dec-expired",
          receipt_status: "expired",
          receipt_expires_at: "2026-09-01T00:00:00.000Z",
          valid_until: "2026-09-01T00:00:00.000Z",
        }),
        row({
          decision_id: "dec-revoked",
          decision_status: "revoked",
          receipt_status: "revoked",
          receipt_revoked_at: "2026-09-18T00:00:00.000Z",
        }),
        row({
          decision_id: "dec-sandbox",
          policy_id: "sandbox_economic_demo",
          receipt_context: "sandbox_only",
        }),
      ],
    });

    expect(view.items.map((item) => item.state)).toEqual([
      "approved",
      "denied",
      "expired",
      "revoked",
      "sandbox_only",
    ]);
    expect(view.items.map((item) => item.state_label)).toEqual([
      PASSPORT_ACTIVITY_STATE_LABELS.approved,
      PASSPORT_ACTIVITY_STATE_LABELS.denied,
      PASSPORT_ACTIVITY_STATE_LABELS.expired,
      PASSPORT_ACTIVITY_STATE_LABELS.revoked,
      PASSPORT_ACTIVITY_STATE_LABELS.sandbox_only,
    ]);
    expect(view.items[0].shared_result_category).toBe("eligibility confirmed");
    expect(view.items[0].current).toBe(true);
    expect(view.items[1].recovery).toMatch(/not shown/i);
    expect(view.items[2].recovery).toMatch(/new verification/i);
    expect(view.items[2].recovery).toMatch(/does not reissue/i);
    expect(view.items[3].current).toBe(false);
    expect(view.items[4].sandbox_only).toBe(true);
    expect(view.items[4].recovery).toMatch(/not Production-usable/i);
  });

  it("serializes only safe client fields", () => {
    const item = buildPassportActivityItem(row(), SUBJECT_A, NOW);
    expect(item).not.toBeNull();
    expect(Object.keys(item!).sort()).toEqual([...PASSPORT_ACTIVITY_CLIENT_ITEM_KEYS].sort());
    const view = buildPassportActivityView({ subjectId: SUBJECT_A, rows: [row()], now: NOW });
    expect(Object.keys(view).sort()).toEqual([...PASSPORT_ACTIVITY_CLIENT_VIEW_KEYS].sort());
  });

  it("never leaks PII, receipt ids, signatures, wallets, or claims JSON", () => {
    const view = buildPassportActivityView({
      subjectId: SUBJECT_A,
      now: NOW,
      rows: [
        row({
          requested_action: "contact holder@example.com at 0xabcdef0123456789abcdef0123456789",
        }),
      ],
    });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(/holder@example.com/);
    expect(serialized).not.toMatch(/0x[a-f0-9]{20,}/i);
    expect(serialized).not.toContain("dec-approved");
    expect(serialized).not.toContain("claims_json");
    expect(serialized).not.toContain("signature");
    expect(serialized).not.toContain("receipt_id");
    expect(serialized).not.toContain(SUBJECT_A);
    expect(view.notice.toLowerCase()).toContain("is not universal access");
    expect(view.notice.toLowerCase()).toMatch(/identity credential/);
    expect(view.notice.toLowerCase()).toMatch(/payment authorization/);
    expect(view.items[0].evidence_not_shared).toMatch(/not shared/i);
    expect(view.items[0].partner_received).toMatch(/only the policy result/i);
    expect(passportActivityCopyLeaks(serialized)).toEqual([]);
  });

  it("scopes opaque refs per subject so holders cannot correlate another holder", () => {
    const a = opaqueActivityRef(SUBJECT_A, "dec-1");
    const b = opaqueActivityRef(SUBJECT_B, "dec-1");
    expect(a).toMatch(/^act_[a-f0-9]{12}$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("dec-1");
  });

  it("bounds the result set", () => {
    const rows = Array.from({ length: PASSPORT_ACTIVITY_LIMIT + 5 }, (_, i) =>
      row({ decision_id: `dec-${i}`, decided_at: `2026-09-01T00:00:${String(i).padStart(2, "0")}.000Z` }),
    );
    const view = buildPassportActivityView({ subjectId: SUBJECT_A, rows, now: NOW });
    expect(view.items).toHaveLength(PASSPORT_ACTIVITY_LIMIT);
    expect(view.truncated).toBe(true);
  });

  it("skips manual_review and unknown decisions", () => {
    expect(resolvePassportActivityState(row({ decision: "manual_review" }), NOW)).toBeNull();
    expect(buildPassportActivityItem(row({ decision: "pending" }), SUBJECT_A, NOW)).toBeNull();
  });

  it("uses stored partner entry only and unknown partners as Partner", () => {
    const known = buildPassportActivityItem(row(), SUBJECT_A, NOW)!;
    expect(known.partner_label).toBe("Good Trouble");
    expect(known.partner_entry_href).toBe("https://www.goodtroublecanna.com/");
    const unknown = buildPassportActivityItem(row({ partner_id: "unknown-partner" }), SUBJECT_A, NOW)!;
    expect(unknown.partner_label).toBe("Partner");
    expect(unknown.partner_entry_href).toBeNull();
  });

  it("rejects unsafe purpose text", () => {
    expect(safePurposeText("0xabc", "fallback")).toBe("fallback");
    expect(safePurposeText("user@x.com", "fallback")).toBe("fallback");
    expect(safePurposeText("receipt_id=abc", "fallback")).toBe("fallback");
  });

  it("exposes accessible status labels for every state", () => {
    for (const state of Object.keys(PASSPORT_ACTIVITY_STATE_LABELS)) {
      expect(PASSPORT_ACTIVITY_STATE_LABELS[state as keyof typeof PASSPORT_ACTIVITY_STATE_LABELS].length).toBeGreaterThan(4);
    }
    const denied = buildPassportActivityItem(row({ decision: "denied" }), SUBJECT_A, NOW)!;
    expect(denied.state_label).toBe("Denied");
    expect(denied.recovery).not.toMatch(/threshold|claim_type|SQLSTATE/i);
  });
});
