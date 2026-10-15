// @vitest-environment jsdom
// FILE: components/passport/PassportReusableCredentialsPanel.identitySurface.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { IDENTITY_LOOKUP_UNAVAILABLE_COPY } from "@/lib/passport/holderIdentityReconciliation";
import { PassportReusableCredentialsPanel } from "@/components/passport/PassportReusableCredentialsPanel";

vi.mock("@/lib/passport/registerHolderPossessionKeyClient", () => ({
  registerHolderPossessionKeyWithServer: vi.fn(),
}));

vi.mock("@/lib/passport/holderPossessionKeyBrowserStorage", () => ({
  isPossessionRememberDeviceEnabled: () => false,
  loadHolderPossessionKeyMaterial: async () => null,
  setPossessionRememberDevice: vi.fn(),
  storeHolderPossessionKeyMaterial: vi.fn(),
}));

function mockPassportFetch(holderIdentity: {
  state: string;
  headline: string;
  detail: string;
  operator_review_required: boolean;
}) {
  global.fetch = vi.fn(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes("/api/passport/reusable-credentials/status")) {
      return new Response(
        JSON.stringify({
          lifecycle: {
            state: "pending_verification",
            headline: "Verification required",
            detail: "Complete identity verification to proceed.",
          },
          holder_identity: holderIdentity,
        }),
        { status: 200 },
      );
    }
    if (url.includes("/api/passport/reusable-credentials")) {
      return new Response(
        JSON.stringify({ credentials: [], sandbox_only: true, issuer_backed: false }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
}

describe("PassportReusableCredentialsPanel holder identity surface (Build #579)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it("desktop: identity lookup unavailable shows safe copy and defers repeat verification nudge", async () => {
    mockPassportFetch({
      state: "identity_lookup_unavailable",
      headline: IDENTITY_LOOKUP_UNAVAILABLE_COPY.headline,
      detail: IDENTITY_LOOKUP_UNAVAILABLE_COPY.detail,
      operator_review_required: false,
    });
    render(<PassportReusableCredentialsPanel sessionReady />);
    expect(await screen.findByRole("status")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(IDENTITY_LOOKUP_UNAVAILABLE_COPY.headline)).toBeTruthy();
    });
    expect(screen.getByText(/do not start verification again/i)).toBeTruthy();
    expect(
      screen.getByText(/Wait and refresh this page rather than starting verification again/i),
    ).toBeTruthy();
  });

  it("mobile viewport: operator reconciliation banner remains visible", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    window.dispatchEvent(new Event("resize"));
    mockPassportFetch({
      state: "reconciliation_operator_required",
      headline: "Identity reconciliation required",
      detail:
        "Verified identity records exist for this account but no canonical holder subject is linked yet. Operator review will complete reconciliation before issuer-backed credentials activate.",
      operator_review_required: true,
    });
    render(<PassportReusableCredentialsPanel sessionReady />);
    await waitFor(() => {
      expect(screen.getByText(/Identity reconciliation required/i)).toBeTruthy();
    });
    expect(screen.getByText(/Operator review will complete reconciliation/i)).toBeTruthy();
  });

  it("ambiguous identity blocked headline is shown", async () => {
    mockPassportFetch({
      state: "ambiguous_identity_blocked",
      headline: "Identity reconciliation blocked",
      detail: "Conflicting legacy identity signals require operator review before reusable Passport issuance can continue.",
      operator_review_required: true,
    });
    render(<PassportReusableCredentialsPanel sessionReady />);
    await waitFor(() => {
      expect(screen.getByText(/Identity reconciliation blocked/i)).toBeTruthy();
    });
  });
});
