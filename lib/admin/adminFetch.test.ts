// FILE: lib/admin/adminFetch.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminFetch } from "./adminFetch";

const ROOT = resolve(__dirname, "../..");

function readSource(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("adminFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}")) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("includes credentials and never adds x-admin-pin", async () => {
    await adminFetch("/api/admin/privacy/requests");

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(init?.credentials).toBe("include");
    const headers = new Headers(init?.headers);
    expect(headers.has("x-admin-pin")).toBe(false);
  });

  it("strips x-admin-pin if caller passes it", async () => {
    await adminFetch("/api/admin/identity/queue", {
      headers: { "x-admin-pin": "should-not-send", "Content-Type": "application/json" },
    });

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.has("x-admin-pin")).toBe(false);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init?.credentials).toBe("include");
  });

  it("preserves method and body", async () => {
    const body = JSON.stringify({ action: "start_review" });
    await adminFetch("/api/admin/privacy/requests/req-1", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(body);
    expect(init?.credentials).toBe("include");
  });
});

const MIGRATED_SOURCES = [
  "app/admin/partner-flow/page.tsx",
  "app/admin/identity/page.tsx",
  "app/admin/privacy/page.tsx",
  "components/admin/RevocationControlPanel.tsx",
] as const;

describe("Phase 3b-2a migrated admin surfaces", () => {
  for (const rel of MIGRATED_SOURCES) {
    it(`${rel} does not send x-admin-pin`, () => {
      const source = readSource(rel);
      expect(source).not.toContain("x-admin-pin");
    });
  }

  it("identity page has no page-level PIN input or pin state", () => {
    const source = readSource("app/admin/identity/page.tsx");
    expect(source).not.toMatch(/type="password"/);
    expect(source).not.toMatch(/useState\(""\).*pin|const \[pin,/i);
    expect(source).not.toContain("adminPin");
    expect(source).toContain("adminFetch");
  });

  it("privacy page has no page-level PIN input or pin state", () => {
    const source = readSource("app/admin/privacy/page.tsx");
    expect(source).not.toMatch(/type="password"/);
    expect(source).not.toMatch(/const \[pin,/);
    expect(source).toContain("adminFetch");
  });

  it("RevocationControlPanel uses adminFetch without adminPin prop", () => {
    const source = readSource("components/admin/RevocationControlPanel.tsx");
    expect(source).not.toContain("adminPin");
    expect(source).toContain("adminFetch");
  });

  it("partner-flow page uses adminFetch", () => {
    const source = readSource("app/admin/partner-flow/page.tsx");
    expect(source).toContain("adminFetch");
    expect(source).not.toMatch(/type="password"/);
  });
});

describe("admin auth behavior unchanged (non-migrated surfaces)", () => {
  const UNTOUCHED_WITH_PIN = [
    "app/admin/partners/page.tsx",
    "app/admin/receipts/page.tsx",
    "app/admin/trust/page.tsx",
    "app/admin/connect/page.tsx",
    "app/admin/partner-sandbox-demo/PartnerSandboxDemoClient.tsx",
    "app/admin/design-partners/page.tsx",
    "app/admin/inquiries/page.tsx",
    "app/admin/listings/page.tsx",
    "app/admin/cielo/page.tsx",
  ] as const;

  for (const rel of UNTOUCHED_WITH_PIN) {
    it(`${rel} still references x-admin-pin or sessionStorage PIN gate`, () => {
      const source = readSource(rel);
      const hasPinAuth =
        source.includes("x-admin-pin")
        || source.includes("abraxas_admin_pin")
        || source.includes('type="password"');
      expect(hasPinAuth).toBe(true);
    });
  }

  it("layout gate and adminAuth module are unchanged patterns", () => {
    const layout = readSource("app/admin/layout.tsx");
    expect(layout).toContain("/api/admin/access");
    expect(layout).toContain("/api/admin/session");
    const auth = readSource("lib/adminAuth.ts");
    expect(auth).toContain("checkAdminAccess");
    expect(auth).toContain("abraxas_admin_session");
  });
});
