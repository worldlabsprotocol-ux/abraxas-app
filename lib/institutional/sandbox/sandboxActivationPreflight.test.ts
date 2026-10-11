import { describe, expect, it, afterEach } from "vitest";
import { runSandboxActivationPreflight } from "@/lib/institutional/sandbox/sandboxActivationPreflight";

describe("sandboxActivationPreflight", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("marks endpoint PASS when consume returns 401", async () => {
    process.env.INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID = "unit-test-sandbox";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ocntwbxarpjeixdnzide.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const fetchFn = async () => new Response(JSON.stringify({ error: "invalid_api_key" }), { status: 401 });

    const report = await runSandboxActivationPreflight({
      baseUrl: "https://sandbox.example",
      fetchFn: fetchFn as typeof fetch,
    });

    const endpoint = report.checks.find(c => c.id === "public_consume_endpoint");
    expect(endpoint?.verdict).toBe("PASS");
    expect(report.schema).toBe("institutional_sandbox_activation_preflight_v1");
  });
});
