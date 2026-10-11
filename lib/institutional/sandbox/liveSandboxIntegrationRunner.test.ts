import { describe, expect, it, afterEach } from "vitest";
import {
  liveSandboxAuthorizationStatus,
  runLiveSandboxIntegrationTests,
} from "@/lib/institutional/sandbox/liveSandboxIntegrationRunner";

describe("liveSandboxIntegrationRunner", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("returns BLOCKED when not authorized", async () => {
    delete process.env.INSTITUTIONAL_SANDBOX_LIVE_TEST_AUTHORIZED;
    const status = liveSandboxAuthorizationStatus();
    expect(status.authorized).toBe(false);
    const report = await runLiveSandboxIntegrationTests();
    expect(report.overall).toBe("BLOCKED");
    expect(report.missing_dependencies.length).toBeGreaterThan(0);
  });

  it("runs auth probe with mocked fetch when authorized", async () => {
    process.env.INSTITUTIONAL_SANDBOX_LIVE_TEST_AUTHORIZED = "true";
    process.env.INSTITUTIONAL_SANDBOX_BASE_URL = "https://sandbox.example";
    process.env.INSTITUTIONAL_SANDBOX_API_KEY = "abx_test_mock";
    process.env.INSTITUTIONAL_SANDBOX_PARTNER_ID = "institutional-platform";
    process.env.INSTITUTIONAL_SANDBOX_TEST_RECEIPT_ID = "rcpt_test";
    process.env.INSTITUTIONAL_SANDBOX_TEST_POLICY_ID = "policy-test";

    const seenNonces = new Set<string>();
    const fetchFn = async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/status")) {
        return new Response(JSON.stringify({ receipt_id: "rcpt_test", trust: { signature_valid: true } }), { status: 200 });
      }
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const auth = (init?.headers as Record<string, string>)?.Authorization ?? "";
      if (auth.includes("invalid_key_for_probe")) {
        return new Response(JSON.stringify({ error: "invalid_api_key" }), { status: 401 });
      }
      if (body.policy_id?.endsWith("-wrong")) {
        return new Response(JSON.stringify({ error: "policy_mismatch" }), { status: 403 });
      }
      const nonce = String(body.replay_nonce ?? "");
      if (seenNonces.has(nonce)) {
        return new Response(JSON.stringify({ error: "replay_rejected" }), { status: 409 });
      }
      seenNonces.add(nonce);
      return new Response(JSON.stringify({ decision: { outcome: "permit" }, narrow_result: {} }), { status: 200 });
    };

    const report = await runLiveSandboxIntegrationTests({ fetchFn: fetchFn as typeof fetch });
    expect(report.authorized).toBe(true);
    expect(report.stages.find(s => s.stage === "authentication_invalid_key")?.verdict).toBe("PASS");
  });
});
