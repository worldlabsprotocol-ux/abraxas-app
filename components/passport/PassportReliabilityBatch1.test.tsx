// @vitest-environment jsdom
// FILE: components/passport/PassportReliabilityBatch1.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PassportSetupPanel } from "./PassportSetupPanel";
import { PassportPrivacyCenter } from "./PassportPrivacyCenter";
import * as signingSession from "@/lib/sui/zklogin/signingSession";
import * as personalMessage from "@/lib/sui/intent/personalMessage";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";

const setup: PassportSetupState = computePassportSetupState({
  walletDone: true,
  identityStatus: "not_started",
  credentialStatus: "not_issued",
  walletBindingL3: false,
});

const setupPanelProps = {
  walletDone: true,
  suiAddress: "0x1234567890abcdef1234567890abcdef12345678",
  email: "holder@example.com",
  setup,
  identityStatus: "not_started" as const,
  credential: null,
  isPolling: false,
  isRefreshing: false,
  starting: false,
  error: null,
  veriffConfigured: false,
  idvProvider: "veriff" as const,
  onStartIdCheck: vi.fn(),
  onRefresh: vi.fn(),
};

function privacyWrapper(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PassportSetupPanel wallet bind", () => {
  it("disables the bind button while loading", async () => {
    vi.spyOn(signingSession, "getEphemeralSecretKey").mockReturnValue("ephemeral-secret-key");
    vi.spyOn(personalMessage, "signIntentMessage").mockImplementation(() => new Promise(() => {}));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challenge_id: "ch_1", message: "bind-me" }), { status: 200 }),
    ));

    render(<PassportSetupPanel {...setupPanelProps} />);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /Secure your Passport/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Waiting for signature/i })).toBeDisabled();
    });
  });

  it("shows fixed challenge failure copy without API error text", async () => {
    vi.spyOn(signingSession, "getEphemeralSecretKey").mockReturnValue("ephemeral-secret-key");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "db_timeout" }), { status: 500 }),
    ));

    render(<PassportSetupPanel {...setupPanelProps} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Secure your Passport/i }));

    expect(await screen.findByText("Couldn't start wallet binding. Try again in a moment.")).toBeInTheDocument();
    expect(screen.queryByText("db_timeout")).not.toBeInTheDocument();
  });

  it("prevents duplicate challenge requests on double click", async () => {
    vi.spyOn(signingSession, "getEphemeralSecretKey").mockReturnValue("ephemeral-secret-key");
    vi.spyOn(personalMessage, "signIntentMessage").mockImplementation(() => new Promise(() => {}));

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challenge_id: "ch_1", message: "bind-me" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<PassportSetupPanel {...setupPanelProps} />);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /Secure your Passport/i });
    await user.dblClick(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe("PassportPrivacyCenter unavailable state", () => {
  it("shows holder-safe copy and not migration jargon", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));

    render(
      privacyWrapper(<PassportPrivacyCenter suiAddress="0xabc" />),
    );

    expect(await screen.findByText(/Privacy settings aren't available right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/migration 060/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("calls refetch when Try again is clicked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        disclaimer: "beta",
        data_categories: [],
        export_note: "",
        deletion_note: "",
        requests: [],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      privacyWrapper(<PassportPrivacyCenter suiAddress="0xabc" />),
    );

    const user = userEvent.setup();
    await screen.findByRole("button", { name: "Try again" });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
