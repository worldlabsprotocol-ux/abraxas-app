// @vitest-environment jsdom
// FILE: components/partner/PartnerFlowReturnHandler.test.tsx

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerFlowReturnHandler } from "./PartnerFlowReturnHandler";
import { PartnerReturnCta } from "@/components/passport/PartnerReturnCta";
import {
  buildPartnerFlowCompleteBody,
  type PartnerFlowHandoffContext,
  usePartnerFlowHandoff,
} from "@/lib/passport/partnerFlowHandoff";

const baseContext: PartnerFlowHandoffContext = {
  suiAddress: "0x1234567890abcdef1234567890abcdef12345678",
  identityStatus: "earned",
  hasCredential: true,
  returnPath: encodeURIComponent("https://partner.example/callback"),
  partnerId: "demo_partner",
  policyId: "demo-policy-v1",
  verificationRequestId: "vr_demo",
};

function HandoffHarness({
  context,
  autoRun = true,
  showCta = false,
}: {
  context: PartnerFlowHandoffContext;
  autoRun?: boolean;
  showCta?: boolean;
}) {
  const handoff = usePartnerFlowHandoff(context);
  return (
    <>
      {autoRun ? <PartnerFlowReturnHandler handoff={handoff} /> : null}
      {showCta ? <PartnerReturnCta handoff={handoff} label="Return to partner flow →" /> : null}
      <button type="button" onClick={() => void handoff.complete()}>
        Manual complete
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("buildPartnerFlowCompleteBody", () => {
  it("preserves exact completion body including verification_request_id", () => {
    expect(buildPartnerFlowCompleteBody(baseContext)).toEqual({
      partner_id: "demo_partner",
      policy_id: "demo-policy-v1",
      return_url: "https://partner.example/callback",
      verification_request_id: "vr_demo",
    });
  });

  it("omits verification_request_id when null", () => {
    expect(buildPartnerFlowCompleteBody({
      ...baseContext,
      verificationRequestId: null,
    })).toEqual({
      partner_id: "demo_partner",
      policy_id: "demo-policy-v1",
      return_url: "https://partner.example/callback",
    });
  });
});

describe("PartnerFlowReturnHandler", () => {
  it("shows return pending when partner context exists but handoff is not ready", () => {
    render(
      <HandoffHarness
        context={{
          ...baseContext,
          identityStatus: "pending",
          hasCredential: false,
        }}
      />,
    );

    expect(screen.getByText("Return pending")).toBeInTheDocument();
  });

  it("renders nothing when partner context is absent", () => {
    const handoff = {
      isPartnerFlowContext: false,
      ready: false,
      phase: "idle" as const,
      failureCategory: null,
      inFlight: false,
      complete: vi.fn(),
    };
    const { container } = render(<PartnerFlowReturnHandler handoff={handoff} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows completing copy while the handoff request is in flight", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })));

    render(<HandoffHarness context={baseContext} />);

    expect(await screen.findByText("Returning you to the partner app…")).toBeInTheDocument();

    resolveFetch(new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }));
  });

  it("shows fixed handoff failure copy without raw API error text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "internal_secret_code" }), { status: 500 }),
    ));

    render(<HandoffHarness context={baseContext} />);

    expect(await screen.findByText("Couldn't return you to the partner app.")).toBeInTheDocument();
    expect(screen.queryByText("internal_secret_code")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows network failure copy on fetch throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network_down_secret")));

    render(<HandoffHarness context={baseContext} />);

    expect(await screen.findByText("Connection problem during handoff.")).toBeInTheDocument();
    expect(screen.queryByText("network_down_secret")).not.toBeInTheDocument();
  });

  it("redirects when complete returns redirect_url", async () => {
    const locationSpy = { href: "" };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationSpy,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }),
    ));

    render(<HandoffHarness context={baseContext} />);

    await waitFor(() => {
      expect(locationSpy.href).toBe("https://partner.example/done");
    });
  });

  it("retries handoff when Try again is clicked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "fail" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const locationSpy = { href: "" };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationSpy,
    });

    render(<HandoffHarness context={baseContext} />);

    const user = userEvent.setup();
    await screen.findByRole("button", { name: "Try again" });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("treats inFlight complete() as a no-op", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<HandoffHarness context={baseContext} autoRun={false} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Manual complete" }));
    await user.click(screen.getByRole("button", { name: "Manual complete" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }));
  });

  it("auto-run plus manual CTA click produces only one POST", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<HandoffHarness context={baseContext} showCta />);

    const cta = screen.getByRole("button", { name: /Return to partner flow/ });
    fireEvent.click(cta);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    resolveFetch(new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }));
  });

  it("disables PartnerReturnCta while inFlight", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })));

    render(<HandoffHarness context={baseContext} autoRun={false} showCta />);

    const cta = screen.getByRole("button", { name: "Return to partner flow →" });
    expect(cta).not.toBeDisabled();

    const user = userEvent.setup();
    await user.click(cta);

    expect(cta).toBeDisabled();

    resolveFetch(new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }));
  });
});

describe("Passport CTA surfaces", () => {
  const readSource = (relativePath: string) =>
    readFileSync(join(process.cwd(), relativePath), "utf8");

  it("does not use direct decoded return href in PassportVerifiedHero", () => {
    const source = readSource("components/passport/PassportVerifiedHero.tsx");
    expect(source).not.toMatch(/href=\{decodeURIComponent\(returnPath\)\}/);
  });

  it("does not use direct decoded return href in PassportDashboard", () => {
    const source = readSource("components/passport/PassportDashboard.tsx");
    expect(source).not.toMatch(/href=\{decodeURIComponent\(returnPath\)\}/);
  });

  it("does not use direct decoded return href in PassportSetupPanel", () => {
    const source = readSource("components/passport/PassportSetupPanel.tsx");
    expect(source).not.toMatch(/href=\{decodeURIComponent\(returnPath\)\}/);
  });
});
