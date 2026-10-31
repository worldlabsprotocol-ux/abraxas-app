// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicVerifierPanel } from "./PublicVerifierPanel";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  routerPush.mockReset();
});

describe("PublicVerifierPanel", () => {
  it("makes direct lookup primary and does not show a fabricated verified state", () => {
    render(<PublicVerifierPanel />);

    expect(screen.getByRole("textbox", { name: "Public record identifier" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Verify identifier" })).toBeVisible();
    expect(screen.queryByText("Verify attested records")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified and active")).not.toBeInTheDocument();
  });

  it("sends a public record ID to the live registry lookup", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: "RESOLVED_VALID",
        query: "ABX-CUSTOM-TEST",
        resolved_type: "registry_entry",
        did: null,
        entity_label: "Test record",
        asset_class: null,
        verification_status: "RESOLVED_VALID",
        current_pipeline_stage: null,
        issuance_timestamp: null,
        last_sync_timestamp: null,
        assurance_level: 1,
        assurance_taxonomy: {},
        anchor_block: null,
        notice: "Test response",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PublicVerifierPanel />);

    fireEvent.change(screen.getByRole("textbox", { name: "Public record identifier" }), {
      target: { value: "ABX-CUSTOM-TEST" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify identifier" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/verify/registry?q=ABX-CUSTOM-TEST");
    });
    expect(await screen.findByText("Verified and active")).toBeVisible();
  });

  it("keeps historical record examples linked to canonical record verification", () => {
    render(<PublicVerifierPanel />);

    fireEvent.click(screen.getByText("Reference examples and test outcomes"));
    fireEvent.click(screen.getByRole("button", { name: "Verify historical Cielo record" }));

    expect(routerPush).toHaveBeenCalledWith("/verify/ABX-RE-HOSP-001");
  });
});
