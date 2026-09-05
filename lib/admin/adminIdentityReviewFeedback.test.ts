// @vitest-environment jsdom
// FILE: lib/admin/adminIdentityReviewFeedback.test.ts

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import AdminIdentityPage from "@/app/admin/identity/page";
import * as adminFetchModule from "@/lib/admin/adminFetch";

const queueItem = {
  id: "doc_1",
  created_at: "2026-08-16T00:00:00.000Z",
  user_email: "reviewer@example.com",
  sui_address: "0x1234567890abcdef1234567890abcdef12345678",
  file_name: "passport.jpg",
  storage_path: "captures/doc_1/front.jpg",
  status: "pending",
  reviewer_note: null,
  legal_name: "Ada Lovelace",
  capture_session_id: "sess_12345678",
  capture_complete: true,
  documents: [
    { id: "d1", document_type: "id_front", storage_path: "captures/doc_1/front.jpg" },
    { id: "d2", document_type: "selfie", storage_path: "captures/doc_1/selfie.jpg" },
  ],
  biometric: { assurance_level: "L2" },
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("status=pending"),
}));

vi.mock("@/components/admin/RevocationControlPanel", () => ({
  RevocationControlPanel: () => null,
}));

vi.mock("@/components/admin/IdentityReviewSubNav", () => ({
  IdentityReviewSubNav: () => createElement("div", { "data-testid": "identity-subnav" }),
}));

function mockIdentityApis() {
  vi.spyOn(adminFetchModule, "adminFetch").mockImplementation(async (url, init) => {
    if (typeof url === "string" && url.includes("/api/admin/identity/queue")) {
      return new Response(JSON.stringify({ items: [queueItem] }), { status: 200 });
    }
    if (typeof url === "string" && url.includes("/api/admin/identity/approve") && init?.method === "POST") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (typeof url === "string" && url.includes("/api/admin/identity/document-url")) {
      return new Response(JSON.stringify({ signed_url: "https://example.com/doc.jpg" }), { status: 200 });
    }
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("AdminIdentityPage review feedback", () => {
  it("shows approved success copy after confirm", async () => {
    mockIdentityApis();
    render(createElement(AdminIdentityPage));
    await screen.findByText("Ada Lovelace");

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Reviewer reason/i), "Verified DOB from government ID");
    await user.type(screen.getByTitle(/Document date of birth/i), "1990-01-15");
    await user.click(screen.getByRole("button", { name: /Approve L2/i }));
    await user.click(screen.getByRole("button", { name: /Approve and issue credential/i }));

    await waitFor(() => {
      expect(screen.getByText("Identity approved. Queue refreshed.")).toBeInTheDocument();
    });
  });

  it("disables resubmit while confirm dialog is open", async () => {
    mockIdentityApis();
    render(createElement(AdminIdentityPage));
    await screen.findByText("Ada Lovelace");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: "Resubmit" })).toBeDisabled();
  });

  it("disables notes textarea while an item action is in flight", async () => {
    vi.spyOn(adminFetchModule, "adminFetch").mockImplementation(async (url, init) => {
      if (typeof url === "string" && url.includes("/api/admin/identity/queue")) {
        return new Response(JSON.stringify({ items: [queueItem] }), { status: 200 });
      }
      if (typeof url === "string" && url.includes("/api/admin/identity/approve") && init?.method === "POST") {
        await new Promise(resolve => setTimeout(resolve, 100));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (typeof url === "string" && url.includes("/api/admin/identity/document-url")) {
        return new Response(JSON.stringify({ signed_url: "https://example.com/doc.jpg" }), { status: 200 });
      }
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    });

    render(createElement(AdminIdentityPage));
    await screen.findByText("Ada Lovelace");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Resubmit" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Reviewer reason/i)).toBeDisabled();
    });
  });
});
