// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
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
  it("retains the authorized test action for a partner session", () => {
    operational.signedIn = true;
    renderTask();
    expect(screen.getByRole("button", { name: "Run test" })).toBeEnabled();
  });
});

