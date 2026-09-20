// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { POLICY_VERSION_PLANNER_ENTRY } from "@/lib/partner/launchpad/policyVersionPlanner/contract";
import { buildPolicyVersionPlannerView } from "@/lib/partner/launchpad/policyVersionPlanner/view";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

afterEach(() => {
  cleanup();
});

describe("Policy version planner accessible copy", () => {
  it("uses semantic headings and non-color-only status", () => {
    const application: LaunchpadApplicationRow = {
      id: "app-1",
      public_slug: "acme-retail",
      partner_id: "acme",
      application_name: "Acme retail",
      display_name: "Acme",
      environment: "sandbox",
      policy_id: "acme-age_21_retail-v1",
      policy_version: 1,
      policy_template_id: "age_21_retail",
      allowed_return_urls: ["http://localhost:3000/callback"],
      api_key_id: "key-1",
      production_api_key_id: null,
      production_key_revealed_at: null,
      status: "active",
      idempotency_key: null,
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    };
    const view = buildPolicyVersionPlannerView(application);
    expect(POLICY_VERSION_PLANNER_ENTRY).toBe("Policy version");
    expect(view.availability_label.length).toBeGreaterThan(8);
    expect(view.comparison?.compatibility_label).toMatch(/Unchanged|retest|review/);
    render(
      <div>
        <h2>{POLICY_VERSION_PLANNER_ENTRY}</h2>
        <p role="status">{view.availability_label}</p>
      </div>,
    );
    expect(screen.getByRole("heading", { name: "Policy version" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/newer catalog version/i);
  });
});
