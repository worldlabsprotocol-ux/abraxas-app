// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { PartnerSandboxReadinessPanel } from "@/components/partner/launchpad/PartnerSandboxReadinessPanel";

const report = {
  overall: "blocked",
  score: { passed: 2, total: 6 },
  next_action: "Add an allowlisted callback URL before running holder-return tests.",
  last_run_at: null,
  production_activation_eligible: false,
  sandbox_pass_is_not_production_authorization: true,
  blockers: [{ code: "callback_missing", detail: "Add a callback." }],
  stages: [
    {
      id: "policy_configured",
      label: "Policy configured",
      status: "pass",
      code: "policy_configured",
      detail: "Pinned.",
      runnable: true,
      last_run_at: null,
    },
    {
      id: "callback_allowlisted",
      label: "Callback allowlisted",
      status: "blocked",
      code: "callback_missing",
      detail: "Add a callback.",
      runnable: true,
      last_run_at: null,
    },
  ],
  evidence: [],
  manifest: {
    artifact: "abraxas_partner_sandbox_manifest",
    sandbox_pass_is_not_production_authorization: true,
  },
};

describe("PartnerSandboxReadinessPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => new Response(JSON.stringify(report), { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders server-derived score and does not activate production", async () => {
    const { findByText, findAllByText, queryByText } = render(createElement(PartnerSandboxReadinessPanel, {
      applicationId: "app-1",
    }));
    expect(await findByText(/Score 2\/6/)).toBeTruthy();
    expect((await findAllByText(/callback_missing/)).length).toBeGreaterThan(0);
    expect(queryByText(/Activate production/i)).toBeNull();
    await waitFor(() => {
      expect(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain(
        "/api/launchpad/applications/app-1/sandbox-readiness",
      );
    });
  });
});
