// @vitest-environment jsdom
// FILE: lib/admin/adminPrivacyPage.test.ts

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import AdminPrivacyPage from "@/app/admin/privacy/page";
import * as adminFetchModule from "@/lib/admin/adminFetch";

const sampleRequest = {
  id: "req_1",
  request_ref: "REF-001",
  request_type: "data_export",
  status: "pending",
  status_label: "Pending",
  subject_pseudonym_id: "pseudo_abcdefghij",
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
};

function mockListResponse() {
  vi.spyOn(adminFetchModule, "adminFetch").mockImplementation(async (url, init) => {
    if (typeof url === "string" && url.includes("/api/admin/privacy/requests") && !init?.method) {
      return new Response(JSON.stringify({ requests: [sampleRequest] }), { status: 200 });
    }
    if (typeof url === "string" && url.includes("/api/admin/privacy/requests/") && init?.method === "POST") {
      await new Promise(resolve => setTimeout(resolve, 50));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ requests: [sampleRequest] }), { status: 200 });
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("AdminPrivacyPage action freeze", () => {
  it("disables row actions while a mutation is loading", async () => {
    mockListResponse();
    render(createElement(AdminPrivacyPage));
    await screen.findByText(/REF-001/);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Review" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Deny" })).toBeDisabled();
    });
  });

  it("disables row actions while a confirm dialog is open", async () => {
    mockListResponse();
    render(createElement(AdminPrivacyPage));
    await screen.findByText(/REF-001/);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Deny" }));

    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Complete" })).toBeDisabled();
  });
});
