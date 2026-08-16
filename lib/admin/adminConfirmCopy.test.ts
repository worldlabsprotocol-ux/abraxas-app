// FILE: lib/admin/adminConfirmCopy.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REVOCATION_REASON_CODES } from "@/lib/decisionReceipts/revocationControlPlane";
import {
  ADMIN_CONFIRM_COPY,
  getAdminConfirmCopy,
  interpolateConfirmCopy,
  type AdminConfirmActionKey,
} from "./adminConfirmCopy";

const ROOT = resolve(__dirname, "../..");

const BATCH_ONE_KEYS: AdminConfirmActionKey[] = [
  "identity.approve",
  "identity.reject",
  "receipt.revoke",
  "partner_key.revoke",
  "privacy.approve_deletion",
  "privacy.approve_export",
  "privacy.deny",
  "privacy.legal_hold",
];

const BATCH_ONE_MODIFIED_SURFACES = [
  "app/admin/identity/page.tsx",
  "app/admin/receipts/page.tsx",
  "components/admin/AdminPartnerKeysPanel.tsx",
  "app/admin/privacy/page.tsx",
] as const;

function readSource(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("adminConfirmCopy batch 1 registry", () => {
  for (const key of BATCH_ONE_KEYS) {
    it(`${key} defines required copy fields`, () => {
      const copy = getAdminConfirmCopy(key);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.confirmLabel.length).toBeGreaterThan(0);
      expect(copy.cancelLabel).toBe("Cancel");
      expect(["low", "medium", "high"]).toContain(copy.risk);
    });
  }

  it("identity entries allow optional reviewer notes in copy metadata", () => {
    expect(getAdminConfirmCopy("identity.approve").noteOptional).toBe(true);
    expect(getAdminConfirmCopy("identity.approve").requireNote).toBe(false);
    expect(getAdminConfirmCopy("identity.reject").noteOptional).toBe(true);
  });

  it("receipt revoke requires reason codes from REVOCATION_REASON_CODES", () => {
    const copy = getAdminConfirmCopy("receipt.revoke");
    expect(copy.requireReasonCode).toBe(true);
    expect(copy.reasonCodeOptions).toEqual(REVOCATION_REASON_CODES);
    expect(copy.body).toContain("{{reasonCode}}");
  });

  it("privacy export copy does not imply automatic delivery", () => {
    const body = getAdminConfirmCopy("privacy.approve_export").body;
    expect(body).toContain("does not deliver an export automatically");
  });

  it("privacy deny copy sets status to denied without holder notification claim", () => {
    const body = getAdminConfirmCopy("privacy.deny").body;
    expect(body).toContain("denied status");
    expect(body.toLowerCase()).not.toContain("notif");
  });

  it("interpolates placeholders", () => {
    const body = interpolateConfirmCopy("Receipt {{receiptId}} reason {{reasonCode}}", {
      receiptId: "rcpt_1",
      reasonCode: "operator_security_review",
    });
    expect(body).toBe("Receipt rcpt_1 reason operator_security_review");
  });

  it("exports exactly eight batch-1 keys", () => {
    expect(Object.keys(ADMIN_CONFIRM_COPY).sort()).toEqual([...BATCH_ONE_KEYS].sort());
  });
});

describe("Phase 3c batch 1 modified surfaces — no window.confirm", () => {
  for (const rel of BATCH_ONE_MODIFIED_SURFACES) {
    it(`${rel} does not use window.confirm`, () => {
      const source = readSource(rel);
      expect(source).not.toContain("window.confirm");
    });
  }

  it("RevocationControlPanel still uses window.confirm (negative control)", () => {
    const source = readSource("components/admin/RevocationControlPanel.tsx");
    expect(source).toContain("window.confirm");
  });
});
