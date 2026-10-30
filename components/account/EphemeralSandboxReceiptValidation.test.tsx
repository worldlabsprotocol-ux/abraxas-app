// FILE: components/account/EphemeralSandboxReceiptValidation.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { buildWalletActionChallengeDisplay } from "@/lib/auth/ephemeralWallet/actionDisplayContext";

const signMessage = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/developers/ephemeral-sandbox",
}));

vi.mock("@/components/developers/EmbeddedIntegrationStudioPanel", () => ({
  EmbeddedIntegrationStudioPanel: () => null,
}));

vi.mock("@solana/wallet-adapter-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => ({
      publicKey: { toBase58: () => "Abcd1234WalletAddressExample111111111111" },
      signMessage,
      connected: true,
      connecting: false,
      connect: vi.fn(),
      select: vi.fn(),
      wallet: { adapter: { name: "Phantom" } },
      wallets: [],
      disconnect: vi.fn(),
    }),
  };
});

describe("EphemeralSandboxWorkspaceClient receipt validation", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signMessage.mockReset();
  });

  beforeEach(() => {
    const receipt = {
      receipt_id: "dr_esbx_test123",
      result_label: "ephemeral_sandbox_test_only",
      test_only: true,
      production_usable: false,
      signature: "sig",
      payload_hash: "hash",
      policy_id: "wallet_control",
      partner_id: "ephemeral_wallet_sandbox",
      decision_result: "approved",
      decision_context: "sandbox_only",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/auth/wallet/enabled")) {
          return new Response(JSON.stringify({ operational: true, config_ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/wallet/session")) {
          return new Response(
            JSON.stringify({
              authenticated: true,
              session_id: "sess_test_123",
              wallet_address: "Abcd1234WalletAddressExample111111111111",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/workspace")) {
          return new Response(
            JSON.stringify({
              ok: true,
              workspace: {
                workspace_id: "esbx_test_workspace",
                expires_at: new Date(Date.now() + 3600_000).toISOString(),
              },
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return new Response(
            JSON.stringify({
              policies: [{ policy_id: "wallet_control", label: "Wallet Control", description: "" }],
              availability: [
                {
                  policy_id: "wallet_control",
                  execution_status: "ready",
                  availability_label: "Ready",
                  availability_detail: "Ready",
                  can_request_verification: true,
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/validate") && init?.method === "POST") {
          expect(signMessage).not.toHaveBeenCalled();
          return new Response(
            JSON.stringify({
              ok: true,
              checked_at: "2026-01-01T00:00:00.000Z",
              signature_authentic: true,
              currently_acceptable: true,
              invalidation_reasons: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );

    // Seed result state by mocking is hard — render and inject via direct state not possible.
    // Instead mount minimal: we'll test validate handler via exposing result through full flow skip.
    void receipt;
  });

  it("validates the receipt automatically without another Phantom signature", async () => {
    // Direct unit-style test of UI branch: render with internal state requires completing verify flow.
    // Mock test-verify to land on result phase.
    const receipt = {
      receipt_id: "dr_esbx_test123",
      result_label: "ephemeral_sandbox_test_only",
      test_only: true,
      production_usable: false,
      signature: "sig",
      payload_hash: "hash",
      policy_id: "wallet_control",
      partner_id: "ephemeral_wallet_sandbox",
      decision_result: "approved",
      decision_context: "sandbox_only",
      schema_version: "v1",
      policy_version: 1,
      subject_pseudonym_id: "subj",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      evaluated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      status: "active",
      signing_key_id: "test",
      signature_valid: true,
      currently_valid: true,
      validity: "active",
      invalidation_reasons: [],
      artifact_type: "eligibility_decision_receipt",
      anchor_reference: null,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/auth/wallet/enabled")) {
          return new Response(JSON.stringify({ operational: true, config_ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/wallet/session")) {
          return new Response(
            JSON.stringify({
              authenticated: true,
              session_id: "sess_test_123",
              wallet_address: "Abcd1234WalletAddressExample111111111111",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/workspace")) {
          return new Response(
            JSON.stringify({
              ok: true,
              workspace: {
                workspace_id: "esbx_test_workspace",
                expires_at: new Date(Date.now() + 3600_000).toISOString(),
              },
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return new Response(
            JSON.stringify({
              policies: [{ policy_id: "wallet_control", label: "Wallet Control", description: "" }],
              availability: [
                {
                  policy_id: "wallet_control",
                  execution_status: "ready",
                  availability_label: "Ready",
                  availability_detail: "Ready",
                  can_request_verification: true,
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/test-verify") && init?.method === "POST") {
          return new Response(
            JSON.stringify({ ok: true, decision: "approved", result: receipt }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/guided-progress") && init?.method === "PATCH") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (url.includes("/api/auth/wallet/sandbox/validate") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              ok: true,
              checked_at: "2026-01-01T00:00:00.000Z",
              signature_authentic: true,
              currently_acceptable: true,
              invalidation_reasons: [],
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/auth/wallet/solana/action/challenge") && init?.method === "POST") {
          const expiresAt = new Date(Date.now() + 60_000).toISOString();
          const challengeId = "ewch_test";
          return new Response(
            JSON.stringify({
              ok: true,
              challenge: {
                challenge_id: challengeId,
                message: "msg",
                expires_at: expiresAt,
                operation: "sandbox:verification:test",
                display: buildWalletActionChallengeDisplay({
                  operation: "sandbox:verification:test",
                  policyId: "wallet_control",
                  walletAddress: "Abcd1234WalletAddressExample111111111111",
                  expiresAt,
                  challengeId,
                }),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );

    signMessage.mockResolvedValue(new Uint8Array([1, 2, 3]));

    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Choose a policy/i)).toBeTruthy());

    // Simulate already on result by triggering test-verify path is heavy; click validate only if result visible.
    // Inject result by posting through review flow shortcuts — use fireEvent on policy + review if mocks allow.

    // Force result visibility: call validate by setting DOM via rerender not available — complete minimal flow:
    fireEvent.click(screen.getByRole("button", { name: /Review request/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Verify with Phantom/i })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Verify with Phantom/i }));

    await waitFor(() =>
      expect(screen.getByTestId("sandbox-completion-active-stage")).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: /Review request/i })).toBeNull();

    await waitFor(
      () =>
        expect(screen.getByRole("heading", { level: 3, name: "Your proof checks out" })).toBeTruthy(),
      { timeout: 5000 },
    );
    expect(screen.getByRole("link", { name: /Connect your application/i })).toBeTruthy();
    expect(screen.getByText(/Signature authentic:/i)).toBeTruthy();
    expect(signMessage).toHaveBeenCalledTimes(1);
  });
});
