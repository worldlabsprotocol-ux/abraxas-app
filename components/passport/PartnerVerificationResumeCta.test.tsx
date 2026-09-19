// @vitest-environment jsdom
// FILE: components/passport/PartnerVerificationResumeCta.test.tsx

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PARTNER_CONTINUATION_STORE_UNAVAILABLE_MESSAGE } from "@/lib/partner/partnerContinuationCopy";
import { PartnerVerificationResumeCta } from "./PartnerVerificationResumeCta";

describe("PartnerVerificationResumeCta", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a recoverable store-unavailable message without a raw return URL or resume button", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      code: "continuation_store_unavailable",
    }), { status: 503 })));

    render(<PartnerVerificationResumeCta />);

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        PARTNER_CONTINUATION_STORE_UNAVAILABLE_MESSAGE,
      );
    });
    expect(screen.queryByRole("button", { name: /Return to partner verification/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/https?:\/\//);
    expect(document.body.textContent).not.toMatch(/return_url|receipt_id/i);
  });

  it("stays hidden when there is no continuation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      hasContinuation: false,
      action: null,
    }), { status: 200 })));

    const { container } = render(<PartnerVerificationResumeCta />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(container.textContent).toBe("");
  });
});
