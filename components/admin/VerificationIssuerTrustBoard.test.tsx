// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerificationIssuerTrustBoard } from "./VerificationIssuerTrustBoard";
import { VERIFICATION_ISSUER_TRUST_NOTICE } from "@/lib/verification/issuerTrust/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("VerificationIssuerTrustBoard", () => {
  it("exposes accessible issuer trust copy and wrap layout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      items: [{
        issuer_ref: "vit_demo",
        record_version: 1,
        label: "Abraxas reusable eligibility",
        method_category: "reuse_existing_proof",
        assurance_level: "L2",
        status_label: "Active",
        integration: "integrated",
        holder_selectable: true,
        current: true,
      }],
    }), { status: 200 })));

    render(<VerificationIssuerTrustBoard />);
    expect(await screen.findByRole("heading", { name: "Verification issuer trust" })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(VERIFICATION_ISSUER_TRUST_NOTICE.slice(0, 40)))).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /Issuer Abraxas reusable eligibility/i })).toBeInTheDocument();
  });
});
