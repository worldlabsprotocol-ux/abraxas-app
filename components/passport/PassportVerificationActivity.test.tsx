// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PassportVerificationActivity } from "./PassportVerificationActivity";
import { PASSPORT_ACTIVITY_EMPTY, PASSPORT_ACTIVITY_UNAVAILABLE } from "@/lib/passport/verificationActivity/contract";

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PassportVerificationActivity", () => {
  it("shows an empty state without leaking identifiers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      version: "1.0.0",
      items: [],
      truncated: false,
      notice: "Partners receive only the policy result.",
      explanation_href: "/docs/why-verification",
      passport_href: "/passport",
    }), { status: 200 })));

    render(wrap(<PassportVerificationActivity />));
    expect(await screen.findByRole("heading", { name: "Connected services" })).toBeInTheDocument();
    expect(await screen.findByText(PASSPORT_ACTIVITY_EMPTY)).toBeInTheDocument();
    expect(screen.queryByText(/receipt/i)).not.toBeInTheDocument();
  });

  it("announces accessible status labels", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      version: "1.0.0",
      items: [{
        activity_ref: "act_abc123def456",
        partner_label: "Good Trouble",
        policy_label: "Age 18 eligibility",
        version_summary: "Version 1",
        state: "approved",
        state_label: "Approved",
        decided_at: "2026-09-19T12:00:00.000Z",
        shared_result_category: "eligibility confirmed",
        purpose: "Confirm adult retail eligibility",
        partner_received: "Only the policy result. Not underlying evidence.",
        withheld: ["date of birth"],
        evidence_not_shared: "Underlying evidence was not shared with the partner.",
        sandbox_only: false,
        current: true,
        recovery: null,
        partner_entry_href: "https://www.goodtroublecanna.com/",
        reuse_consent_notice: "A current result can be reused for a later compatible request only if you give fresh consent. Future partners are not listed here.",
      }],
      truncated: false,
      notice: "Partners receive only the policy result.",
      explanation_href: "/docs/why-verification",
      passport_href: "/passport",
    }), { status: 200 })));

    render(wrap(<PassportVerificationActivity />));
    expect(await screen.findByRole("status", { name: /Result status: Approved, current/i })).toBeInTheDocument();
    expect(screen.getByText(/Underlying evidence was not shared/)).toBeInTheDocument();
    expect(screen.queryByText(/act_abc123def456/)).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Withdraw shared result" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current (1)" })).toHaveAttribute("aria-pressed", "true");
  });

  it("confirms withdrawal with accessible dialog copy and updates to revoked", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const approved = {
      activity_ref: "act_abc123def456",
      partner_label: "Good Trouble",
      policy_label: "Age 18 eligibility",
      version_summary: "Version 1",
      state: "approved",
      state_label: "Approved",
      decided_at: "2026-09-19T12:00:00.000Z",
      shared_result_category: "eligibility confirmed",
      purpose: "Confirm adult retail eligibility",
      partner_received: "Only the policy result. Not underlying evidence.",
      withheld: ["date of birth"],
      evidence_not_shared: "Underlying evidence was not shared with the partner.",
      sandbox_only: false,
      current: true,
      recovery: null,
      partner_entry_href: "https://www.goodtroublecanna.com/",
    };
    const revoked = {
      ...approved,
      state: "revoked",
      state_label: "Revoked",
      current: false,
      recovery: "A partner may request a new verification from their usual entry point.",
    };
    let withdrawn = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/withdraw")) {
        expect(init?.body).toBe(JSON.stringify({ activity_ref: "act_abc123def456" }));
        expect(String(init?.body)).not.toMatch(/receipt_id|decision_id/);
        withdrawn = true;
        return new Response(JSON.stringify({
          ok: true,
          state: "revoked",
          state_label: "Revoked",
          already_withdrawn: false,
          next_step: "This result is revoked. Future partner checks will not accept it.",
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ok: true,
        version: "1.0.0",
        items: [withdrawn ? revoked : approved],
        truncated: false,
        notice: "Partners receive only the policy result.",
        explanation_href: "/docs/why-verification",
        passport_href: "/passport",
      }), { status: 200 });
    }));

    render(wrap(<PassportVerificationActivity />));
    await user.click(await screen.findByRole("button", { name: "Withdraw shared result" }));
    expect(await screen.findByRole("dialog", { name: "Withdraw this shared result?" })).toBeInTheDocument();
    expect(screen.getByText(/Future partner checks will not accept this result/i)).toBeInTheDocument();
    expect(screen.getByText(/does not erase lawful minimal audit history/i)).toBeInTheDocument();
    expect(screen.getByText(/may ask you to verify again later/i)).toBeInTheDocument();
    expect(screen.getByText(/does not reverse a trade, payment, transfer, membership decision/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Withdraw shared result" })[1]!);
    expect(await screen.findByRole("status", { name: /Result status: Revoked, not current/i })).toBeInTheDocument();
    expect(screen.getByText(/Future partner checks will not accept it/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Withdraw shared result" })).not.toBeInTheDocument();
  });

  it("withdraws all current results only after explicit confirmation", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    let bulkWithdrawn = false;
    const currentItem = {
      activity_ref: "act_current_123456",
      partner_label: "Example service",
      policy_label: "Eligibility",
      version_summary: "Version 1",
      state: "approved",
      state_label: "Approved",
      decided_at: "2026-09-19T12:00:00.000Z",
      shared_result_category: "eligible",
      purpose: "Confirm eligibility",
      partner_received: "Only the policy result.",
      withheld: ["underlying evidence"],
      evidence_not_shared: "Underlying evidence was not shared.",
      sandbox_only: false,
      current: true,
      recovery: null,
      partner_entry_href: null,
    };

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/withdraw-all")) {
        expect(init?.body).toBe(JSON.stringify({ confirm: "withdraw_all_current" }));
        bulkWithdrawn = true;
        return new Response(JSON.stringify({
          ok: true,
          withdrawn: 1,
          already_withdrawn: 0,
          failed: 0,
          next_step: "All current shared results are now in History.",
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ok: true,
        version: "1.0.0",
        items: bulkWithdrawn ? [{ ...currentItem, current: false, state: "revoked", state_label: "Revoked" }] : [currentItem],
        truncated: false,
        notice: "Partners receive only the policy result.",
        explanation_href: "/docs/why-verification",
        passport_href: "/passport",
      }), { status: 200 });
    }));

    render(wrap(<PassportVerificationActivity />));
    await user.click(await screen.findByRole("button", { name: "Withdraw all current results" }));
    expect(await screen.findByRole("dialog", { name: "Withdraw all current results?" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Withdraw all current results" })[1]!);
    expect(await screen.findByRole("status", { name: /Result status: Revoked, not current/i })).toBeInTheDocument();
    expect(screen.getByText(/All current shared results are now in History/i)).toBeInTheDocument();
  });

  it("shows unavailable recovery copy", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      error: PASSPORT_ACTIVITY_UNAVAILABLE,
    }), { status: 503 })));

    render(wrap(<PassportVerificationActivity />));
    await waitFor(() => {
      expect(screen.getByText(PASSPORT_ACTIVITY_UNAVAILABLE)).toBeInTheDocument();
    });
  });
});
