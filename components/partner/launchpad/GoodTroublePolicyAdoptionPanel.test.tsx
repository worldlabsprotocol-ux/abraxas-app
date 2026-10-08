// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { GoodTroublePolicyAdoptionPanel } from "./GoodTroublePolicyAdoptionPanel";
import { PolicyChangeControlLaunchpadSlot } from "./PolicyChangeControlLaunchpadSlot";

const applicationId = "690d0c89-7b98-4946-8ad2-7469f5ca89d9";
const overview = (pin: number) => ({
  ok: true, policy_id: "good-trouble-age_21_retail-v1", pinned_version: pin,
  active: { version: 2, status: "active" },
});
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

describe("Good Trouble sandbox policy adoption", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows the authorized sandbox entry point even when a preliminary UI probe is stale", async () => {
    global.fetch = vi.fn(async () => response(overview(1))) as typeof fetch;
    render(createElement(PolicyChangeControlLaunchpadSlot, { available: false, applicationId, goodTroubleSandbox: true }));
    expect(await screen.findByText(/current pinned version:/)).toHaveProperty("textContent", expect.stringContaining("v1"));
    expect(screen.getByText(/planner below is read-only/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adopt v2" })).toBeTruthy();
  });

  it("requires confirmation, sends the exact app and versions, then refreshes the pin", async () => {
    let pin = 1;
    const onChanged = vi.fn();
    global.fetch = vi.fn(async (_url, init) => {
      if (init?.method === "POST") { pin = 2; return response({ ok: true }); }
      return response(overview(pin));
    }) as typeof fetch;
    render(createElement(GoodTroublePolicyAdoptionPanel, { applicationId, onChanged }));
    fireEvent.click(await screen.findByRole("button", { name: "Adopt v2" }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Adopt v2" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    const post = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[1]?.method === "POST");
    expect(post?.[0]).toBe(`/api/launchpad/applications/${applicationId}/policies`);
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({ action: "adopt", version: 2, expected_version: 1 });
    expect(await screen.findByText(/current pinned version:/)).toHaveProperty("textContent", expect.stringContaining("v2"));
  });

  it("does not mutate after cancellation", async () => {
    global.fetch = vi.fn(async () => response(overview(1))) as typeof fetch;
    render(createElement(GoodTroublePolicyAdoptionPanel, { applicationId }));
    fireEvent.click(await screen.findByRole("button", { name: "Adopt v2" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.every((call) => call[1]?.method !== "POST")).toBe(true);
  });

  it("refreshes safely after a stale-version conflict", async () => {
    global.fetch = vi.fn(async (_url, init) => init?.method === "POST"
      ? response({ code: "policy_version_mismatched" }, 409) : response(overview(1))) as typeof fetch;
    render(createElement(GoodTroublePolicyAdoptionPanel, { applicationId }));
    fireEvent.click(await screen.findByRole("button", { name: "Adopt v2" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Adopt v2" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Refresh"));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
  });

  it("shows an authorization error without an adoption action", async () => {
    global.fetch = vi.fn(async () => response({ code: "launchpad_unauthorized" }, 401)) as typeof fetch;
    render(createElement(GoodTroublePolicyAdoptionPanel, { applicationId }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("authorized sandbox credential"));
    expect(screen.queryByRole("button", { name: "Adopt v2" })).toBeNull();
  });
});

