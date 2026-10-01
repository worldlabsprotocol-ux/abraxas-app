// FILE: lib/admin/adminAuthMatrix.test.ts

import { describe, expect, it } from "vitest";
import {
  ADMIN_AUTH_MATRIX,
  UPGRADED_PRODUCTION_SENSITIVE_APIS,
  routesRequiringProductionSessionEmail,
} from "@/lib/admin/adminAuthMatrix";

describe("admin auth matrix", () => {
  it("documents upgraded webhook and privacy routes as production-sensitive", () => {
    expect(UPGRADED_PRODUCTION_SENSITIVE_APIS).toContain("/api/admin/partners/webhooks/retry");
    expect(UPGRADED_PRODUCTION_SENSITIVE_APIS).toContain("/api/admin/privacy/requests");
    expect(UPGRADED_PRODUCTION_SENSITIVE_APIS).toContain("/api/admin/receipts/[receiptId]");
  });

  it("includes operator attention in production session routes", () => {
    expect(routesRequiringProductionSessionEmail()).toContain("/api/admin/operator-attention");
  });

  it("records legacy migration backlog without weakening production routes", () => {
    const legacy = ADMIN_AUTH_MATRIX.find(entry => entry.route === "/api/admin/identity/queue");
    expect(legacy?.notes).toContain("Migration backlog");
    const webhookRetry = ADMIN_AUTH_MATRIX.find(entry => entry.route === "/api/admin/partners/webhooks/retry");
    expect(webhookRetry?.authMechanism).toBe("production_session_email");
  });
});
