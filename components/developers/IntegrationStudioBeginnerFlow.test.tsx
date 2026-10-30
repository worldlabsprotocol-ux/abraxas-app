// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationStudioBeginnerFlow } from "./IntegrationStudioBeginnerFlow";

vi.mock("@/components/developers/BuilderActiveTask", () => ({
  BuilderActiveTask: ({
    title,
    children,
    action,
    advanced,
  }: {
    title: string;
    children?: React.ReactNode;
    action?: React.ReactNode;
    advanced?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
      {action}
      {advanced}
    </section>
  ),
}));

vi.mock("@/components/developers/IntegrationStudioRequestWorkbench", () => ({
  IntegrationStudioRequestWorkbench: ({ packId, policyId }: { packId: string; policyId: string }) => (
    <div data-testid="request-workbench" data-pack-id={packId} data-policy-id={policyId} />
  ),
}));

vi.mock("@/components/redesign/ui", () => ({
  Btn: ({
    children,
    disabled,
    onClick,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
}));

const policyOptions = [
  { id: "age_18_retail" as const, label: "Age 18 eligibility" },
  { id: "age_21_retail" as const, label: "Age 21 eligibility" },
];

function renderFlow(overrides: Partial<React.ComponentProps<typeof IntegrationStudioBeginnerFlow>> = {}) {
  const props: React.ComponentProps<typeof IntegrationStudioBeginnerFlow> = {
    sessionChecked: true,
    signedIn: true,
    walletAuthorized: true,
    configuredAppId: null,
    packId: null,
    policyOptions,
    pathId: "hosted_partner_flow",
    policyId: null,
    applicationName: "Example app",
    onApplicationNameChange: vi.fn(),
    onPolicyPackChange: vi.fn(),
    onCreateSandbox: vi.fn(),
    submitting: false,
    createError: "",
    workspaceStatusLine: "Your workspace is ready",
    onContinueWithWallet: vi.fn(),
    onRefreshSession: vi.fn(),
    ...overrides,
  };
  return { ...render(<IntegrationStudioBeginnerFlow {...props} />), props };
}

describe("Integration Studio beginner policy continuity", () => {
  afterEach(cleanup);

  it("requires a fresh user to choose a supported policy before creating an app", () => {
    const { props } = renderFlow();
    const policy = screen.getByRole("combobox", { name: "What should Abraxas verify?" });
    expect(policy).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create my test app" })).toBeDisabled();

    fireEvent.change(policy, { target: { value: "age_21_retail" } });
    expect(props.onPolicyPackChange).toHaveBeenCalledWith("age_21_retail");
  });

  it("preserves a policy selected before wallet authentication", () => {
    const props = {
      signedIn: false,
      walletAuthorized: false,
      packId: "age_21_retail" as const,
    };
    const view = renderFlow(props);
    expect(screen.getByText("Age 21 eligibility")).toBeInTheDocument();

    view.rerender(
      <IntegrationStudioBeginnerFlow
        {...view.props}
        sessionChecked
        signedIn
        walletAuthorized
      />,
    );
    expect(screen.getByRole("combobox", { name: "What should Abraxas verify?" })).toHaveValue("age_21_retail");
  });

  it("shows a restored app's bound policy without asking the user to select it again", () => {
    renderFlow({
      configuredAppId: "app-existing",
      packId: "age_21_retail",
      policyId: "partner-age_21_retail-v1",
    });

    expect(screen.getByText("Age 21 eligibility")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByTestId("request-workbench")).toHaveAttribute("data-pack-id", "age_21_retail");
  });

  it("allows explicit changes only to catalog-supported policy options", () => {
    const { props } = renderFlow({ packId: "age_21_retail" });
    const policy = screen.getByRole("combobox", { name: "What should Abraxas verify?" });

    fireEvent.change(policy, { target: { value: "age_18_retail" } });
    fireEvent.change(policy, { target: { value: "unsupported_policy" } });

    expect(props.onPolicyPackChange).toHaveBeenCalledTimes(1);
    expect(props.onPolicyPackChange).toHaveBeenCalledWith("age_18_retail");
  });
});
