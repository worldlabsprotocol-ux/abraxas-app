// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PolicyReleaseCandidateBoard } from "@/components/admin/PolicyReleaseCandidateBoard";
import { POLICY_RC_NOTICE } from "@/lib/partner/policyReleaseCandidate/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PolicyReleaseCandidateBoard", () => {
  it("exposes accessible release-candidate controls and wrap layout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      items: [{
        id: "rc-1",
        candidate_ref: "prc_demo",
        proposal_ref: "ppr_demo",
        partner_ref: "ppr_partner",
        status: "draft",
        status_label: "Draft",
        spec: {
          copyable: "A separately reviewed source-code PR is required to publish any policy.",
          checklist: ["catalog pack/version change"],
        },
        fixtures: [{ id: "a", invariant: "exact_result_allowed" }],
      }],
    }), { status: 200 })));

    render(
      <PolicyReleaseCandidateBoard
        proposalId="prop-1"
        proposalRef="ppr_demo"
        canCreate
        createBody={{ confirm: true }}
      />,
    );
    expect(await screen.findByRole("heading", { name: "Release candidates" })).toBeInTheDocument();
    expect(screen.getByText(POLICY_RC_NOTICE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create release candidate" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Release candidate prc_demo/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/Specification for prc_demo/i) as HTMLTextAreaElement).value).toContain(
      "separately reviewed source-code PR",
    );
    expect(screen.getByRole("button", { name: "Approved for catalog PR" })).toBeInTheDocument();
  });
});
