// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationStudioRequestWorkbench } from "./IntegrationStudioRequestWorkbench";

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
  const renderTask = (walletAuthorized: boolean) => render(
    <IntegrationStudioRequestWorkbench packId={null} pathId="verify_with_abraxas" policyId={null} beginnerSurface walletAuthorized={walletAuthorized} />,
  );

  it("explains that a wallet session does not authorize the partner test", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    renderTask(true);
    expect(screen.getByRole("heading", { name: "Partner access needed" })).toBeInTheDocument();
    expect(screen.getByText(/wallet session is active/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open partner workspace" })).toHaveAttribute("href", "/developers/launchpad");
    expect(screen.queryByRole("button", { name: "Run test" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a partner sign-in recovery when neither session is available", () => {
    renderTask(false);
    expect(screen.getByText(/open the partner workspace to sign in/i)).toBeInTheDocument();
  });

  it("retains the authorized test action for a partner session", () => {
    operational.signedIn = true;
    renderTask(false);
    expect(screen.getByRole("button", { name: "Run test" })).toBeEnabled();
  });
});

