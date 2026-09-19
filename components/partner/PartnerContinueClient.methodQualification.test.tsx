// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerContinueClient } from "./PartnerContinueClient";

const ECONOMIC_POLICY_ID = "circle-arc-demo-304-sandbox_economic_demo-v1";
const ECONOMIC_PARTNER_ID = "circle-arc-demo-304";
const VERIFY_REQUEST_ID = "vr-qualify-1";

let mockSearchParams = new URLSearchParams();
let qualificationQualified = false;

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuth: () => ({
    suiAddress: "0xabc",
    isLoading: false,
    session: { email: "holder@example.com" },
  }),
}));

vi.mock("@/lib/hooks/usePassportVerification", () => ({
  usePassportVerification: () => ({
    identityStatus: "not_started",
    credential: null,
    refresh: vi.fn(),
    setup: { walletBound: true, identityComplete: false },
    veriffConfigured: false,
    idvProvider: "manual",
    walletBindingL3: false,
  }),
}));

vi.mock("@/lib/passport/partnerFlowHandoff", () => ({
  usePartnerFlowHandoff: () => ({
    ready: false,
    phase: "idle",
    inFlight: false,
    isPartnerFlowContext: true,
    failureCategory: null,
    complete: vi.fn(),
  }),
}));

function focusableNames(): string[] {
  return Array.from(document.querySelectorAll("button, [href], input, select, textarea, [tabindex]"))
    .filter((el) => {
      const tab = el.getAttribute("tabindex");
      return tab !== "-1" && !(el as HTMLButtonElement).disabled;
    })
    .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
}

function mockPartnerFetch(options?: { qualifyOnPost?: boolean }) {
  qualificationQualified = false;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes(`/api/v1/verification-requests/${VERIFY_REQUEST_ID}`) && !url.includes("consent")) {
      return new Response(JSON.stringify({
        partner_id: ECONOMIC_PARTNER_ID,
        policy_id: ECONOMIC_POLICY_ID,
        purpose: "sandbox_economic_demo",
        policy_name: "Sandbox economic demo",
        claim_labels: [{ claim_type: "product_eligibility", label: "Sandbox demo eligible", will_share: true }],
        status: "pending",
      }), { status: 200 });
    }
    if (url.includes("/api/v1/partner-verify/continue-binding")) {
      return new Response(JSON.stringify({
        ok: true,
        partner_id: ECONOMIC_PARTNER_ID,
        policy_id: ECONOMIC_POLICY_ID,
        return_url: "http://localhost:3000/callback/circle-arc-economic-demo-304",
      }), { status: 200 });
    }
    if (url.includes("/api/v1/partner-verify/method-qualification") && init?.method === "POST") {
      expect(url).not.toMatch(/consent|receipt|settlement/i);
      const qualified = options?.qualifyOnPost !== false;
      qualificationQualified = qualified;
      return new Response(JSON.stringify({
        ok: qualified,
        method_selected: true,
        method_qualified: qualified,
        issuedReceipt: false,
        sandbox_only: true,
      }), { status: qualified ? 200 : 400 });
    }
    if (url.includes("/api/v1/partner-verify/method-qualification")) {
      return new Response(JSON.stringify({
        ok: true,
        method_selected: false,
        method_qualified: qualificationQualified,
        issuedReceipt: false,
        sandbox_only: qualificationQualified,
      }), { status: 200 });
    }
    if (url.includes("/api/age-assurance/providers")) {
      return new Response(JSON.stringify({
        providers: [],
        existing_proof: { eligible_for_reuse: false },
      }), { status: 200 });
    }
    if (url.includes("/consent")) {
      throw new Error("consent must not run during method start");
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;
}

describe("Partner Continue method qualification gating", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams({ verify_request: VERIFY_REQUEST_ID });
    global.fetch = mockPartnerFetch({ qualifyOnPost: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render consent from selection or query flags, and keeps it out of focus order", async () => {
    mockSearchParams = new URLSearchParams({
      verify_request: VERIFY_REQUEST_ID,
      method_qualified: "1",
      method_selected: "1",
    });
    render(<PartnerContinueClient />);
    await waitFor(() => {
      expect(screen.getByText(/Choose how to satisfy this requirement/i)).toBeTruthy();
    });
    expect(screen.queryByText(/Approve & share claims/i)).toBeNull();
    expect(focusableNames().some((name) => /Approve & share claims/i.test(name))).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: /Privacy-preserving verification/i }));
    expect(screen.queryByText(/Approve & share claims/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Use selected method/i })).toBeTruthy();
    expect(focusableNames().some((name) => /Approve & share claims/i.test(name))).toBe(false);
  });

  it("starts the sandbox method without issuing a receipt or rendering consent", async () => {
    render(<PartnerContinueClient />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Privacy-preserving verification/i })).toBeTruthy();
    });
    await userEvent.click(screen.getByRole("button", { name: /Privacy-preserving verification/i }));
    await userEvent.click(screen.getByRole("button", { name: /Use selected method/i }));
    await waitFor(() => {
      expect((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
        (call) => String(call[0]).includes("/api/v1/partner-verify/method-qualification")
          && call[1]?.method === "POST",
      )).toBe(true);
    });
    expect(screen.queryByText(/Approve & share claims/i)).toBeNull();
    expect((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.every(
      (call) => !String(call[0]).includes("/consent"),
    )).toBe(true);
  });

  it("keeps the live Preview error when qualification is not server-confirmed", async () => {
    render(<PartnerContinueClient />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Privacy-preserving verification/i })).toBeTruthy();
    });
    await userEvent.click(screen.getByRole("button", { name: /Privacy-preserving verification/i }));
    expect(screen.queryByText(/The selected method has not qualified yet/i)).toBeNull();
    expect(screen.queryByText(/Approve & share claims/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Use selected method/i }));
    await waitFor(() => {
      expect(screen.getByText("The selected method has not qualified yet.")).toBeTruthy();
    });
    expect(screen.queryByText(/Approve & share claims/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Use selected method/i })).toBeTruthy();
  });

  it("renders final consent only after the server confirms qualification", async () => {
    global.fetch = mockPartnerFetch({ qualifyOnPost: true });
    render(<PartnerContinueClient />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Privacy-preserving verification/i })).toBeTruthy();
    });
    expect(screen.queryByText(/Approve & share claims/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Privacy-preserving verification/i }));
    await userEvent.click(screen.getByRole("button", { name: /Use selected method/i }));
    await waitFor(() => {
      expect(screen.getByText(/Approve & share claims/i)).toBeTruthy();
    });
    expect(screen.queryByText("The selected method has not qualified yet.")).toBeNull();
    expect(screen.queryByRole("button", { name: /Use selected method/i })).toBeNull();
    const chooser = screen.getByText(/Choose how to satisfy this requirement/i);
    const approve = screen.getByText(/Approve & share claims/i);
    expect(chooser.compareDocumentPosition(approve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.every(
      (call) => !String(call[0]).includes("/consent"),
    )).toBe(true);
  });
});
