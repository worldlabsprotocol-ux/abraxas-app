// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationStudioRequestWorkbench } from "./IntegrationStudioRequestWorkbench";
vi.mock("@/components/developers/BeginnerPartnerAccessGate", () => ({
  BeginnerPartnerAccessGate: ({ applicationId }: { applicationId: string }) => <div data-testid="inline-access">{applicationId}</div>,
}));

const operational = vi.hoisted(() => ({
  applicationId: "app-123" as string | null,
  signedIn: false,
  returnUrl: "http://localhost:3000/callback",
  recordHttpTrace: vi.fn(),
}));
vi.mock("@/components/developers/integrationStudioOperationalContext", () => ({
  useIntegrationStudioOperational: () => operational,
}));
vi.mock("@/components/brand/AbraxasLogo", () => ({ AbraxasLogo: () => <span data-testid="emblem" /> }));
vi.mock("@/components/developers/AbraxasJourneyEmblemStatus", () => ({
  AbraxasJourneyEmblemStatus: () => <span role="status" />,
}));
vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ href, children, onClick, disabled, newTab }: { href?: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean; newTab?: boolean }) =>
    href ? <a href={href} target={newTab ? "_blank" : undefined}>{children}</a> : <button disabled={disabled} onClick={onClick}>{children}</button>,
}));

describe("beginner sandbox test access", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); operational.signedIn = false; window.sessionStorage.clear(); window.history.replaceState({}, "", "/"); });
  const renderTask = () => render(
    <IntegrationStudioRequestWorkbench packId={null} pathId="verify_with_abraxas" policyId={null} beginnerSurface />,
  );

  it("keeps partner access recovery inside the active task", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    renderTask();
    expect(screen.getByTestId("inline-access")).toHaveTextContent("app-123");
    expect(screen.queryByRole("link", { name: "Open partner workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run test" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("runs one test after an explicit create action, with no extra wallet signature", async () => {
    operational.signedIn = true;
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authenticated: true, wallet_address: "wallet-1" }) })
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    vi.stubGlobal("fetch", fetch);
    const consumed = vi.fn();
    const { rerender } = render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface autoRunOnReady onAutoRunConsumed={consumed} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(String(fetch.mock.calls[0]?.[0])).toBe("/api/auth/wallet/session");
    expect(String(fetch.mock.calls[1]?.[0])).toContain("/sovereign-trust-execution");
    expect(consumed).toHaveBeenCalledTimes(1);
    rerender(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface autoRunOnReady onAutoRunConsumed={consumed} />);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("retains the authorized test action for a partner session", () => {
    operational.signedIn = true;
    renderTask();
    expect(screen.getByRole("button", { name: "Run test" })).toBeEnabled();
  });
  it("does not label an offchain decision as finalized Solana execution", async () => {
    operational.signedIn = true;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="institutional_eligibility_gate" policyId="wallet_control" beginnerSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Run test" }));
    await waitFor(() => expect(screen.getByText(/requires a finalized Solana authorization/i)).toBeInTheDocument());
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Sandbox test passed")).not.toBeInTheDocument();
  });
  it("shows a completed test only after wallet authorization and independent portable verification", async () => {
    operational.signedIn = true;
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authenticated: true, wallet_address: "wallet-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "awaiting_holder_authorization", challenge_id: "challenge-1", holder_url: "/partner/trust-execution?challenge_id=challenge-1&defer_execution=1", receipt_id: null, decision_result: null, evidence_mode: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "authorized_pending_execution", challenge_id: "challenge-1", holder_url: "", receipt_id: null, decision_result: null, evidence_mode: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "executed", challenge_id: "challenge-1", holder_url: "", receipt_id: "receipt-1", decision_result: "approved", evidence_mode: "controlled_test_evidence" }, independent_verification: { result: { cryptographically_authentic: true, currently_acceptable: "yes" } } }) });
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" applicationName="My test app" beginnerSurface autoRunOnReady />);
    const authorizeLink = await screen.findByRole("link", { name: "Authorize with wallet" });
    expect(authorizeLink).not.toHaveAttribute("target", "_blank");
    expect(authorizeLink).toHaveAttribute("href", expect.stringContaining("return_to="));
    fireEvent.click(screen.getByRole("button", { name: "Check authorization" }));
    await waitFor(() => expect(screen.getByText("My test app")).toBeInTheDocument());
    expect(screen.getByText("Sandbox test passed")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it("presents an independently verified denial as denied, never allowed", async () => {
    operational.signedIn = true;
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authenticated: true, wallet_address: "wallet-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "awaiting_holder_authorization", challenge_id: "challenge-1", holder_url: "/holder", receipt_id: null, decision_result: null, evidence_mode: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "authorized_pending_execution", challenge_id: "challenge-1", holder_url: "", receipt_id: null, decision_result: null, evidence_mode: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "executed", challenge_id: "challenge-1", holder_url: "", receipt_id: "receipt-denied", decision_result: "denied", evidence_mode: "controlled_test_evidence" }, independent_verification: { result: { cryptographically_authentic: true, currently_acceptable: "yes" } } }) });
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface autoRunOnReady />);
    await screen.findByRole("button", { name: "Check authorization" });
    fireEvent.click(screen.getByRole("button", { name: "Check authorization" }));
    await waitFor(() => expect(screen.getByText("This test did not authorize access.")).toBeInTheDocument());
    expect(screen.queryByText("Sandbox test passed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try test again" })).toBeEnabled();
  });
  it("resumes a challenge-bound authorization after same-tab return or refresh", async () => {
    operational.signedIn = true;
    window.history.replaceState({}, "", "/?integration=1&trust_execution_challenge=challenge-returned");
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "authorized_pending_execution", challenge_id: "challenge-returned", holder_url: "", receipt_id: null, decision_result: null, evidence_mode: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "executed", challenge_id: "challenge-returned", holder_url: "", receipt_id: "receipt-returned", decision_result: "approved", evidence_mode: "controlled_test_evidence" }, independent_verification: { result: { cryptographically_authentic: true, currently_acceptable: "yes" } } }) });
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" applicationName="Returned app" beginnerSurface />);
    const continueButton = await screen.findByRole("button", { name: "Check authorization" });
    fireEvent.click(continueButton);
    await waitFor(() => expect(screen.getByText("Sandbox test passed")).toBeInTheDocument());
    expect(String(fetch.mock.calls[0]?.[0])).toContain("challenge-returned");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("fails closed when independent verification rejects the portable receipt", async () => {
    operational.signedIn = true;
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authenticated: true, wallet_address: "wallet-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "awaiting_holder_authorization", challenge_id: "challenge-1", holder_url: "/holder", receipt_id: null, decision_result: null, evidence_mode: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "authorized_pending_execution", challenge_id: "challenge-1", holder_url: "", receipt_id: null, decision_result: null, evidence_mode: null } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ journey: { phase: "executed", challenge_id: "challenge-1", holder_url: "", receipt_id: "receipt-1", decision_result: "approved", evidence_mode: "controlled_test_evidence" }, independent_verification: { result: { cryptographically_authentic: true, currently_acceptable: "no" } } }) });
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface autoRunOnReady />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Check authorization" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Check authorization" }));
    await waitFor(() => expect(screen.getByText(/independent verification did not accept it/i)).toBeInTheDocument());
    expect(screen.queryByText("Sandbox test passed")).not.toBeInTheDocument();
  });
  it("explains when Production cannot issue a durable sandbox receipt", async () => {
    operational.signedIn = true;
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authenticated: true, wallet_address: "wallet-1" }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ ok: false, code: "launchpad_signing_unavailable", error: "Sandbox receipt issuance is temporarily unavailable" }),
      });
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Run test" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "Abraxas could not issue the verifiable sandbox receipt, so no test was run.",
    ));
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expect(screen.queryByText("Sandbox test passed")).not.toBeInTheDocument();
  });
  it("offers session recovery instead of blindly rerunning an unauthorized test", async () => {
    operational.signedIn = true;
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ authenticated: false }) });
    vi.stubGlobal("fetch", fetch);
    const refreshSession = vi.fn();
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface onRefreshSession={refreshSession} />);
    fireEvent.click(screen.getByRole("button", { name: "Run test" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "Sign in with the wallet that will authorize this sandbox action, then run the test again.",
    ));
    fireEvent.click(screen.getByRole("button", { name: "Resume sign-in" }));
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rechecks an issued receipt without running a duplicate test", async () => {
    operational.signedIn = true;
    window.sessionStorage.setItem("abraxas:harness-pending:app-123", JSON.stringify({
      tone: "success",
      receiptId: "receipt-1",
      headline: "Test worked",
      summary: "",
      observedAccess: "allow",
      passed: true,
      nextActionLabel: "Connect",
    }));
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, receipt_id: "receipt-1", harness_verification_ok: true }) });
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface autoRunOnReady />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Recheck receipt" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Recheck receipt" }));
    await waitFor(() => expect(screen.getByText("Sandbox test passed")).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[1]?.[0])).toContain("/receipts/validate?");
  });
  it("revalidates a restored result instead of trusting session storage", async () => {
    operational.signedIn = true;
    window.sessionStorage.setItem("abx_studio_harness_success_v1_app-123", JSON.stringify({ outcome: { tone: "success", receiptId: "receipt-1", headline: "Test worked", summary: "", observedAccess: "allow", passed: true, nextActionLabel: "Connect" } }));
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, receipt_id: "receipt-1", harness_verification_ok: false }) });
    vi.stubGlobal("fetch", fetch);
    render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface />);
    await waitFor(() => expect(screen.getByText(/previous receipt is no longer valid/i)).toBeInTheDocument());
    expect(screen.queryByText("Sandbox test passed")).not.toBeInTheDocument();
  });
});




