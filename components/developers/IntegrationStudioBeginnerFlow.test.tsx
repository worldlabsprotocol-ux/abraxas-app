// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationStudioBeginnerFlow } from "./IntegrationStudioBeginnerFlow";

vi.mock("@/components/brand/AbraxasLogo", () => ({ AbraxasLogo: () => <span /> }));
vi.mock("@/components/developers/AbraxasJourneyEmblemStatus", () => ({ AbraxasJourneyEmblemStatus: () => <span /> }));
vi.mock("@/components/developers/IntegrationStudioRequestWorkbench", () => ({
  IntegrationStudioRequestWorkbench: () => <div data-testid="workbench" />,
}));
vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
}));

const base = {
  sessionChecked: true, signedIn: true, walletAuthorized: true,
  configuredAppId: null, availableApps: [{ id: "owned-app", application_name: "My app", policy_id: "wallet_control" }],
  choice: "choose" as const, onChoiceChange: vi.fn(), selectedAppId: null,
  onSelectedAppIdChange: vi.fn(), autoRunTest: false, onAutoRunTestConsumed: vi.fn(),
  packId: "wallet_control" as const, pathId: "verify_with_abraxas" as const, policyId: "wallet_control",
  applicationName: "", onApplicationNameChange: vi.fn(), onCreateSandbox: vi.fn(), submitting: false,
  createError: "", workspaceStatusLine: "Ready", onContinueWithWallet: vi.fn(), onRefreshSession: vi.fn(),
};

describe("beginner integration choice", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it("requires an explicit new or existing app choice", () => {
    render(<IntegrationStudioBeginnerFlow {...base} />);
    expect(screen.getByTestId("beginner-integration-choice")).toBeInTheDocument();
    expect(screen.queryByTestId("workbench")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create a new integration/i }));
    expect(base.onChoiceChange).toHaveBeenCalledWith("new");
  });
  it("offers only applications supplied by the authenticated workspace", () => {
    render(<IntegrationStudioBeginnerFlow {...base} choice="existing" />);
    fireEvent.click(screen.getByRole("button", { name: /My app/i }));
    expect(base.onSelectedAppIdChange).toHaveBeenCalledWith("owned-app");
  });
  it("does not show an application action without authorization", () => {
    render(<IntegrationStudioBeginnerFlow {...base} signedIn={false} walletAuthorized={false} />);
    expect(screen.getByTestId("beginner-sign-in-required")).toBeInTheDocument();
    expect(screen.queryByText("My app")).not.toBeInTheDocument();
  });
});
