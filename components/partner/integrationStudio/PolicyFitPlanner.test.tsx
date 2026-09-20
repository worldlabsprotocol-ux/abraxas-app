// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PolicyFitPlanner } from "@/app/developers/integration-studio/PolicyFitPlanner";
import { POLICY_FIT_REVIEW_NOTICE } from "@/lib/partner/integrationStudio/policyFit/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PolicyFitPlanner", () => {
  it("exposes accessible headings and pressed state labels", async () => {
    render(<PolicyFitPlanner onApply={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Find the right policy" })).toBeInTheDocument();
    expect(screen.getByText(/What action do you want to gate/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gate storefront browse or checkout" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/A new or Production policy requires review/i)).toBeInTheDocument();
  });

  it("applies a recommended pack to Studio selection", async () => {
    const onApply = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      fit: true,
      intent: { action: "retail_access", category: "age_21", environment: "sandbox", capabilities: ["reusable_result"] },
      recommended: {
        pack_id: "age_21_retail",
        pack_display_name: "Age 21 eligibility",
        catalog_version: 1,
        policy_result: "Signed result age_eligible_21",
        method_category: "Reuse existing proof",
        withheld: ["date of birth"],
        production_path: "Can follow the reviewed Production upgrade path after sandbox readiness.",
        sandbox_only: false,
        why: "maps to Age 21 eligibility",
        google_is_account_only: "Google sign-in creates an Abraxas account.",
        identity_appears_only_when_required: "Identity or liveness is not the default path for this pack.",
        paths: ["hosted_partner_flow"],
        selected_path: "hosted_partner_flow",
        starter_kit_platforms: ["universal_https"],
        score: 100,
      },
      alternatives: [],
      no_fit_message: null,
      design_partner_href: "/design-partner?source=integration-studio-policy-fit",
      copyable_summary: "Policy fit summary",
      review_notice: POLICY_FIT_REVIEW_NOTICE,
      studio_selection: { pack_id: "age_21_retail", path: "hosted_partner_flow", capabilities: ["reusable_result"] },
    }), { status: 200 })));

    render(<PolicyFitPlanner onApply={onApply} />);
    await userEvent.click(screen.getByRole("button", { name: "Find matching policy pack" }));
    expect(await screen.findByRole("heading", { name: /Recommended pack: Age 21 eligibility/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Fit found/i);
    await userEvent.click(screen.getByRole("button", { name: "Use this pack in Studio" }));
    expect(onApply).toHaveBeenCalledWith({
      packId: "age_21_retail",
      pathId: "hosted_partner_flow",
      capabilities: [],
    });
  });

  it("shows Talk to us copy on no-fit", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      fit: false,
      intent: { action: "retail_access", category: "identity_liveness", environment: "sandbox", capabilities: ["reusable_result"] },
      recommended: null,
      alternatives: [],
      no_fit_message: "No existing policy pack matches these choices. Talk to us about a policy fit.",
      design_partner_href: "/design-partner?source=integration-studio-policy-fit&action=retail_access",
      copyable_summary: "summary",
      review_notice: POLICY_FIT_REVIEW_NOTICE,
      studio_selection: { pack_id: null, path: "hosted_partner_flow", capabilities: ["reusable_result"] },
    }), { status: 200 })));

    render(<PolicyFitPlanner onApply={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Find matching policy pack" }));
    expect(await screen.findByRole("heading", { name: "Talk to us about a policy fit" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Talk to us about a policy fit/i }).getAttribute("href")).toContain("/design-partner");
  });
});
