// FILE: components/integrations/IntegrationsApplyForm.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignPartnerApplicationForm } from "./DesignPartnerApplicationForm";
import { DESIGN_PARTNER_APPLY_HONEYPOT_FIELD } from "@/lib/integrations/designPartnerApplicationIntake";

describe("DesignPartnerApplicationForm", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows pending state and prevents double submit", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => {
      resolveFetch = resolve;
    }));

    render(<DesignPartnerApplicationForm />);

    fireEvent.change(screen.getByLabelText(/Company \/ protocol/i), { target: { value: "Acme Protocol" } });
    fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: "partner@example.com" } });

    const submit = screen.getByRole("button", { name: /Submit for manual review/i });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Submitting application/i })).toHaveProperty("disabled", true);

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await waitFor(() => {
      const status = screen.getByRole("status");
      expect(status.getAttribute("aria-live")).toBe("polite");
    });
  });

  it("renders honeypot field hidden from tab order", () => {
    render(<DesignPartnerApplicationForm />);
    const honeypot = document.querySelector(`input[name="${DESIGN_PARTNER_APPLY_HONEYPOT_FIELD}"]`) as HTMLInputElement;
    expect(honeypot).toBeTruthy();
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows generic alert on validation failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid request" }),
    });

    render(<DesignPartnerApplicationForm />);
    fireEvent.change(screen.getByLabelText(/Company \/ protocol/i), { target: { value: "Acme Protocol" } });
    fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: "partner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit for manual review/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Invalid request");
    });
  });
});
