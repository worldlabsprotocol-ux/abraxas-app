// @vitest-environment jsdom
// FILE: components/partner/launchpad/InstitutionalSandboxFirstVerificationCard.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InstitutionalSandboxFirstVerificationCard,
  fetchInstitutionalIntegrationHealth,
} from "./InstitutionalSandboxFirstVerificationCard";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function integrationHealthJson(label: string, verificationSuccesses: number) {
  return {
    ok: true,
    verification_successes: verificationSuccesses,
    status: "healthy",
    institutional_activation: {
      contract_version: "1.0.0",
      current_milestone_id: "independent_verification_succeeded",
      needs_attention_reason: null,
      time_to_first_independent_verify_ms: verificationSuccesses > 0 ? 1000 : null,
      time_to_first_independent_verify_quality: verificationSuccesses > 0 ? "measured" : "unavailable",
      milestones: [
        {
          id: "independent_verification_succeeded",
          label,
          status: "complete",
          detail: "done",
          observed_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  };
}

function deferredFetchGate(applicationIds: string[]) {
  const gates = Object.fromEntries(
    applicationIds.map((id) => [id, createDeferred<Response>()]),
  ) as Record<string, ReturnType<typeof createDeferred<Response>>>;

  vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    const applicationId = applicationIds.find((id) => url.includes(id));
    if (!applicationId) {
      throw new Error(`Unexpected integration-health URL: ${url}`);
    }
    return gates[applicationId].promise;
  });

  return gates;
}

describe("InstitutionalSandboxFirstVerificationCard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows loading then milestones when health succeeds", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        verification_successes: 0,
        status: "healthy",
        institutional_activation: {
          contract_version: "1.0.0",
          current_milestone_id: "sandbox_application_provisioned",
          needs_attention_reason: null,
          time_to_first_independent_verify_ms: null,
          time_to_first_independent_verify_quality: "unavailable",
          milestones: [
            {
              id: "sandbox_application_provisioned",
              label: "Sandbox application provisioned",
              status: "complete",
              detail: "done",
              observed_at: null,
            },
          ],
        },
      }),
    } as Response);

    render(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-a"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    expect(screen.getByText(/Loading activation evidence/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("list")).toHaveTextContent(/Sandbox application provisioned/i);
    });
    expect(screen.getByText(/Not yet recorded/i)).toBeInTheDocument();
  });

  it("shows session error with retry when unauthorized", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    render(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-a"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Sign in again with your sandbox API key/i);
    });
    expect(screen.getByRole("button", { name: /Retry loading evidence/i })).toBeInTheDocument();
  });

  it("clears stale milestones when application id changes", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("app-b")) {
        return {
          ok: false,
          status: 403,
          json: async () => ({}),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          verification_successes: 1,
          status: "healthy",
          institutional_activation: {
            contract_version: "1.0.0",
            current_milestone_id: "independent_verification_succeeded",
            needs_attention_reason: null,
            time_to_first_independent_verify_ms: 1000,
            time_to_first_independent_verify_quality: "measured",
            milestones: [
              {
                id: "independent_verification_succeeded",
                label: "Independent receipt verification succeeded",
                status: "complete",
                detail: "done",
                observed_at: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
        }),
      } as Response;
    });

    const { rerender } = render(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-a"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Observed/i)).toBeInTheDocument();
    });

    rerender(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-b"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Independent receipt verification succeeded/i)).not.toBeInTheDocument();
  });

  it("ignores a late Application A response after Application B succeeds (B resolves first)", async () => {
    const gates = deferredFetchGate(["app-a", "app-b"]);

    const { rerender } = render(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-a"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    expect(screen.getByText(/Loading activation evidence/i)).toBeInTheDocument();

    rerender(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-b"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    gates["app-b"].resolve({
      ok: true,
      status: 200,
      json: async () => integrationHealthJson("Application B exclusive evidence", 2),
    } as Response);

    await waitFor(() => {
      expect(screen.getByRole("list")).toHaveTextContent(/Application B exclusive evidence/i);
    });
    expect(screen.getByText(/Observed/i)).toBeInTheDocument();

    gates["app-a"].resolve({
      ok: true,
      status: 200,
      json: async () => integrationHealthJson("Application A stale evidence", 9),
    } as Response);

    await waitFor(() => {
      expect(screen.getByRole("list")).toHaveTextContent(/Application B exclusive evidence/i);
    });
    expect(screen.queryByText(/Application A stale evidence/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Observed/i)).toBeInTheDocument();
  });

  it("ignores a late Application A response after Application B succeeds (A resolves first)", async () => {
    const gates = deferredFetchGate(["app-a", "app-b"]);

    const { rerender } = render(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-a"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    rerender(
      <InstitutionalSandboxFirstVerificationCard
        applicationId="app-b"
        journey={null}
        onNavigate={() => {}}
      />,
    );

    gates["app-a"].resolve({
      ok: true,
      status: 200,
      json: async () => integrationHealthJson("Application A stale evidence", 9),
    } as Response);

    await waitFor(() => {
      expect(screen.queryByText(/Application A stale evidence/i)).not.toBeInTheDocument();
    });

    gates["app-b"].resolve({
      ok: true,
      status: 200,
      json: async () => integrationHealthJson("Application B exclusive evidence", 2),
    } as Response);

    await waitFor(() => {
      expect(screen.getByRole("list")).toHaveTextContent(/Application B exclusive evidence/i);
    });
    expect(screen.queryByText(/Application A stale evidence/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Observed/i)).toBeInTheDocument();
  });
});

describe("fetchInstitutionalIntegrationHealth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns session_expired for 403 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "forbidden" }),
    } as Response));

    const result = await fetchInstitutionalIntegrationHealth("app-x");
    expect(result.kind).toBe("session_expired");
  });
});
