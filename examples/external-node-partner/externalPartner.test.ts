import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHostedHandoff, fetchPortableVerificationBundle } from "./src/abraxasHttp.js";
import { parseCallbackQuery } from "./src/callback.js";
import { loadPinnedTrustAnchor, verifyPortableBundle } from "./src/verifyPortable.js";
import { build821SyntheticFixtureSet } from "../integration-first-relying-party/syntheticFixtureFactory";

describe("Build #830 external HTTP partner", () => {
  it("creates handoff via fetch without @/lib", async () => {
    const mockFetch: typeof fetch = async (input, init) => {
      expect(String(input)).toContain("/api/v1/partner-handoff");
      expect(init?.method).toBe("POST");
      const headers = init?.headers as Record<string, string>;
      expect(headers.authorization).toBe("Bearer abx_test_mock");
      return new Response(
        JSON.stringify({
          ok: true,
          hosted_url: "https://demo.example/partner/verify",
          verify_request: "vr_test_1",
          handoff_ref: "ho_test_1",
        }),
        { status: 200 },
      );
    };
    const result = await createHostedHandoff({
      baseUrl: "https://demo.abraxasworld.xyz",
      apiKey: "abx_test_mock",
      applicationId: "app_test",
      fetchFn: mockFetch,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.verify_request).toBe("vr_test_1");
  });

  it("rejects callback without receipt_id", () => {
    const parsed = parseCallbackQuery(new URLSearchParams("decision=approved"));
    expect(parsed.ok).toBe(false);
  });

  it("verifies synthetic portable bundle with wrong partner → deny/indeterminate", () => {
    const set = build821SyntheticFixtureSet();
    const pin = loadPinnedTrustAnchor(set.trust_anchor_bundle);
    const bundle = {
      decision_receipt: set.decision_receipt,
      bundled_trust_anchor: set.trust_anchor_bundle,
      signed_issuer_authority: set.issuer_authority_statement,
      signed_status_statement: set.signed_status_statement,
      registry_version: set.issuer_authority_statement.payload.registry_version,
    };
    const wrong = verifyPortableBundle({
      bundle,
      pinnedTrustAnchor: pin,
      expectedPartnerId: "wrong-partner",
      expectedPolicyId: set.decision_receipt.policy_id,
      environment: "demo",
    });
    expect(wrong.enforcement.action).not.toBe("permit");

    const right = verifyPortableBundle({
      bundle,
      pinnedTrustAnchor: pin,
      expectedPartnerId: set.decision_receipt.partner_id,
      expectedPolicyId: set.decision_receipt.policy_id,
      environment: "demo",
      now: new Date("2026-06-01T12:00:05.000Z"),
    });
    expect(right.verification.cryptographically_authentic).toBe(true);
  });

  it("rejects wrong trust anchor fingerprint", () => {
    const set = build821SyntheticFixtureSet();
    const pin = loadPinnedTrustAnchor(set.trust_anchor_bundle);
    const bundled = { ...set.trust_anchor_bundle, public_key_fingerprint: "deadbeef".repeat(8) };
    const bundle = {
      decision_receipt: set.decision_receipt,
      bundled_trust_anchor: bundled,
      signed_issuer_authority: set.issuer_authority_statement,
      signed_status_statement: set.signed_status_statement,
      registry_version: 1,
    };
    const result = verifyPortableBundle({
      bundle,
      pinnedTrustAnchor: pin,
      expectedPartnerId: set.decision_receipt.partner_id,
      expectedPolicyId: set.decision_receipt.policy_id,
      environment: "demo",
    });
    expect(result.enforcement.action).toBe("indeterminate");
    expect(result.enforcement.failure_codes).toContain("anchor_fingerprint_mismatch");
  });

  it("source tree has no @/lib imports", () => {
    const dir = join(import.meta.dirname, "src");
    const files = ["abraxasHttp.ts", "callback.ts", "config.ts", "enforce.ts", "pendingStore.ts", "server.ts", "verifyPortable.ts"];
    for (const f of files) {
      const text = readFileSync(join(dir, f), "utf8");
      expect(text).not.toMatch(/@\/lib/);
    }
  });

  it("portable fetch errors map to retryable failure", async () => {
    const mockFetch: typeof fetch = async () => new Response("unavailable", { status: 503 });
    const result = await fetchPortableVerificationBundle({
      baseUrl: "https://demo.abraxasworld.xyz",
      receiptId: "dr_x",
      fetchFn: mockFetch,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });
});
