// @vitest-environment jsdom
// FILE: lib/admin/adminReceiptsPage.test.ts

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import AdminReceiptsPage from "@/app/admin/receipts/page";

const receiptRow = {
  receipt_id: "rcpt_demo_001",
  policy_id: "policy_demo",
  policy_version: 1,
  partner_id: "partner_demo",
  decision_result: "allow",
  status: "active",
  decision_context: "checkout",
  signature_valid: true,
  evaluated_at: "2026-08-16T00:00:00.000Z",
  expires_at: null,
  decision_id: "dec_001",
};

const receiptDetail = {
  receipt: {
    ...receiptRow,
    reason_codes: [],
    evaluated_claim_refs: [],
    consent_receipt_id: null,
    wallet_binding_ref: null,
    payload_hash: "hash",
    signing_key_id: "key_1",
  },
  signature_status: "valid",
  resolved_status: "active",
  audit_timeline: [],
};

function mockReceiptFetch() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/admin/receipts") && !init?.method) {
      return new Response(JSON.stringify({ receipts: [receiptRow] }), { status: 200 });
    }
    if (url.includes("/api/admin/receipts/rcpt_demo_001") && !init?.method) {
      await new Promise(resolve => setTimeout(resolve, 30));
      return new Response(JSON.stringify(receiptDetail), { status: 200 });
    }
    if (url.includes("/api/admin/receipts/rcpt_demo_001") && init?.method === "POST") {
      return new Response(JSON.stringify({
        receipt_id: "rcpt_demo_001",
        reason_code: "operator_request",
        revoked_at: "2026-08-16T12:00:00.000Z",
        already_revoked: false,
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ receipts: [receiptRow] }), { status: 200 });
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("AdminReceiptsPage loading and revoke feedback", () => {
  it("keeps list header count while detail is loading", async () => {
    mockReceiptFetch();
    render(createElement(AdminReceiptsPage));
    await screen.findByText("1 receipts");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /rcpt_demo_001/i }));

    expect(screen.getByText("1 receipts")).toBeInTheDocument();
    await screen.findByText("Receipt inspector");
  });

  it("shows revoke success copy after confirmation", async () => {
    mockReceiptFetch();
    render(createElement(AdminReceiptsPage));
    await screen.findByText("1 receipts");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /rcpt_demo_001/i }));
    await screen.findByText("Receipt inspector");

    await user.click(screen.getByRole("button", { name: "Revoke receipt" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Revoke receipt" }));

    await waitFor(() => {
      expect(screen.getByText(/Receipt rcpt_demo_001 revoked/i)).toBeInTheDocument();
      expect(screen.getByText(/Reason: operator_request/i)).toBeInTheDocument();
    });
  });

  it("includes mobile split layout styles", () => {
    mockReceiptFetch();
    const { container } = render(createElement(AdminReceiptsPage));
    expect(container.querySelector(".admin-receipts-split")).toBeTruthy();
    expect(container.innerHTML).toContain("@media (max-width: 960px)");
    expect(container.innerHTML).toContain("admin-receipts-back");
  });
});
