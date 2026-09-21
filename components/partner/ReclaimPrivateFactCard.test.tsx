/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReclaimPrivateFactCard } from "@/components/partner/ReclaimPrivateFactCard";
import { RECLAIM_HOLDER_COPY } from "@/lib/reclaimAttestation/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReclaimPrivateFactCard", () => {
  it("exposes recoverable copy and a mobile-friendly heading", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ available: true }), { status: 200 })));
    render(<ReclaimPrivateFactCard verifyRequestId="vr_test" />);
    expect(screen.getByRole("heading", { name: RECLAIM_HOLDER_COPY })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start private check" })).toBeInTheDocument();
    expect(screen.queryByText(/provider id|app secret|gmail|linkedin/i)).toBeNull();
  });
});
