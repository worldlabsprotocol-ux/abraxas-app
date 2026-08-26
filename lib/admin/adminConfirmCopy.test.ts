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

const BATCH_TWO_KEYS: AdminConfirmActionKey[] = [
  "webhook.rotate_secret",
  "policy.publish",
  "revocation.partner_scoped",
  "design_partner.promote",
  "design_partner.reject",
  "partner_key.issue",
];

const ALL_KEYS: AdminConfirmActionKey[] = [...BATCH_ONE_KEYS, ...BATCH_TWO_KEYS];

const BATCH_ONE_MODIFIED_SURFACES = [
  "app/admin/identity/page.tsx",
  "app/admin/receipts/page.tsx",
  "components/admin/AdminPartnerKeysPanel.tsx",
  "app/admin/privacy/page.tsx",
] as const;

const BATCH_TWO_MODIFIED_SURFACES = [
  "components/admin/PartnerWebhooksPanel.tsx",
  "components/admin/PartnerOnboardingConsole.tsx",
  "components/admin/RevocationControlPanel.tsx",
  "app/admin/design-partners/page.tsx",
  "components/admin/AdminPartnerKeysPanel.tsx",
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
});

describe("adminConfirmCopy batch 2 registry", () => {
  for (const key of BATCH_TWO_KEYS) {
    it(`${key} defines required copy fields`, () => {
      const copy = getAdminConfirmCopy(key);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.confirmLabel.length).toBeGreaterThan(0);
      expect(copy.cancelLabel).toBe("Cancel");
      expect(["low", "medium", "high"]).toContain(copy.risk);
    });
  }

  it("webhook rotate copy uses rotation response and secret manager wording", () => {
    const body = getAdminConfirmCopy("webhook.rotate_secret").body;
    expect(body).toContain("returned once in the rotation response");
    expect(body).toContain("approved secret manager");
    expect(body.toLowerCase()).not.toContain("this session");
  });

  it("revocation.partner_scoped requires reason codes from REVOCATION_REASON_CODES", () => {
    const copy = getAdminConfirmCopy("revocation.partner_scoped");
    expect(copy.requireReasonCode).toBe(true);
    expect(copy.reasonCodeOptions).toEqual(REVOCATION_REASON_CODES);
    expect(copy.body).toContain("{{reasonCode}}");
  });

  it("design_partner.promote copy mentions sandbox key only", () => {
    const body = getAdminConfirmCopy("design_partner.promote").body;
    expect(body).toContain("abx_test_");
    expect(body).toContain("approved secret manager");
    expect(body.toLowerCase()).not.toContain("production");
    expect(body.toLowerCase()).not.toContain("abx_live");
  });

  it("design_partner.reject copy uses company only and states no side effects", () => {
    const copy = getAdminConfirmCopy("design_partner.reject");
    const body = interpolateConfirmCopy(copy.body, { company: "Acme Corp" });
    expect(body).toContain("Acme Corp");
    expect(body).not.toContain("{{company}}");
    expect(body).not.toContain("@");
    expect(body.toLowerCase()).toContain("no partner");
    expect(body.toLowerCase()).toContain("api key");
    expect(body.toLowerCase()).toContain("policy");
    expect(body.toLowerCase()).toContain("kept for audit");
    expect(copy.body).not.toContain("{{email}}");
    expect(copy.body).not.toContain("email");
  });

  it("partner_key.issue copy does not claim auto-revoke of existing keys", () => {
    const body = getAdminConfirmCopy("partner_key.issue").body;
    expect(body).toContain("not revoked automatically");
    expect(body).toContain("approved secret manager");
  });

  it("policy.publish copy mentions immutability without unsupported claims", () => {
    const body = getAdminConfirmCopy("policy.publish").body;
    expect(body).toContain("immutable after publish");
    expect(body.toLowerCase()).not.toContain("webhook");
    expect(body.toLowerCase()).not.toContain("api key");
  });

  it("exports exactly fourteen keys across batch 1 and batch 2", () => {
    expect(Object.keys(ADMIN_CONFIRM_COPY).sort()).toEqual([...ALL_KEYS].sort());
  });
});

describe("Phase 3c batch 1 modified surfaces — no window.confirm", () => {
  for (const rel of BATCH_ONE_MODIFIED_SURFACES) {
    it(`${rel} does not use window.confirm`, () => {
      const source = readSource(rel);
      expect(source).not.toContain("window.confirm");
    });
  }
});

describe("Phase 3c batch 2 modified surfaces — no window.confirm", () => {
  for (const rel of BATCH_TWO_MODIFIED_SURFACES) {
    it(`${rel} does not use window.confirm`, () => {
      const source = readSource(rel);
      expect(source).not.toContain("window.confirm");
    });
  }

  it("PassportPrivacyCenter still uses window.confirm (negative control)", () => {
    const source = readSource("components/passport/PassportPrivacyCenter.tsx");
    expect(source).toContain("window.confirm");
  });
});
