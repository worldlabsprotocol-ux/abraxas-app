// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
  Btn: ({ href, children, onClick, disabled }: { href?: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    href ? <a href={href}>{children}</a> : <button disabled={disabled} onClick={onClick}>{children}</button>,
}));

describe("beginner sandbox test access", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); operational.signedIn = false; });
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
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    vi.stubGlobal("fetch", fetch);
    const consumed = vi.fn();
    const { rerender } = render(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface autoRunOnReady onAutoRunConsumed={consumed} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/api/launchpad/applications/app-123/test");
    expect(consumed).toHaveBeenCalledTimes(1);
    rerender(<IntegrationStudioRequestWorkbench packId="wallet_control" pathId="verify_with_abraxas" policyId="wallet_control" beginnerSurface autoRunOnReady onAutoRunConsumed={consumed} />);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("retains the authorized test action for a partner session", () => {
    operational.signedIn = true;
    renderTask();
    expect(screen.getByRole("button", { name: "Run test" })).toBeEnabled();
  });
});

