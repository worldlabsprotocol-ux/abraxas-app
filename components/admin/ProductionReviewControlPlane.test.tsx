// @vitest-environment jsdom
// FILE: components/admin/ProductionReviewControlPlane.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ProductionReviewControlPlane } from "./ProductionReviewControlPlane";

vi.mock("@/lib/admin/adminFetch", () => ({
  adminFetch: vi.fn(async (url: string) => {
    if (url.includes("binding-production-review?status=approved")) {
      return {
        ok: true,
        json: async () => ({ items: [] }),
      };
    }
    if (url.includes("binding-production-review")) {
      return {
        ok: true,
        json: async () => ({
          items: [{
            request_id: "req-bind-1",
            binding_id: "bind-1",
            app_label: "Good Trouble",
            policy_id: "good-trouble-residency_us-v1",
            policy_version: 1,
            pack_id: "residency_us",
            result_family: "US residency",
            binding_role: "secondary",
            production_status: "production_under_review",
            submitted_note: null,
            submitted_at: new Date().toISOString(),
            decision_status: "pending",
            verified_receipts: 0,
            request_volume: 1,
            blockers: ["verified_receipts_missing"],
          }],
        }),
      };
    }
    if (url.includes("status=approved")) {
      return {
        ok: true,
        json: async () => ({ items: [] }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        items: [{
          request_ref: "PR-001",
          request_id: "req-app-1",
          app_label: "Good Trouble",
          policy_id: "good-trouble-age_21_retail-v1",
          policy_version: 1,
          selected_capabilities: ["verify"],
          sandbox_readiness_class: "ready",
          test_console_class: "ready",
          webhook_health_class: "ready",
          policy_compatibility_class: "ready",
          network_contexts: [],
          submitted_note: null,
          submitted_at: new Date().toISOString(),
          decision_status: "pending",
          credential_state: "never_issued",
        }],
      }),
    };
  }),
}));

describe("ProductionReviewControlPlane", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("surfaces decision-required copy for application and binding queues", async () => {
    render(<ProductionReviewControlPlane />);
    await waitFor(() => {
      expect(screen.getByText("Production review control plane")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Decision required").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/does not authorize every configured policy binding/i)).toBeInTheDocument();
    expect(screen.getByText(/this policy binding only/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject application production request/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve binding production/i })).toBeInTheDocument();
  });
});
