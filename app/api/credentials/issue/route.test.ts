import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const VALID_BODY = {
  sui_address: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  document_type: "passport",
  document_country: "US",
  liveness_passed: true,
};

function postIssue(headers: Record<string, string> = {}) {
  return POST(new NextRequest("http://localhost/api/credentials/issue", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(VALID_BODY),
  }));
}

describe("POST /api/credentials/issue authorization", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = "test-internal-secret";
    process.env.ABRAXAS_SIGNING_KEY = "";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests in development", async () => {
    process.env.NODE_ENV = "development";
    const res = await postIssue();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("credential_issuance_forbidden");
    expect(JSON.stringify(body)).not.toContain("test-internal-secret");
  });

  it("rejects invalid secret", async () => {
    process.env.NODE_ENV = "production";
    const res = await postIssue({ "x-internal-secret": "wrong-secret-value" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("credential_issuance_forbidden");
  });

  it("rejects when INTERNAL_API_SECRET is missing", async () => {
    delete process.env.INTERNAL_API_SECRET;
    process.env.NODE_ENV = "test";
    const res = await postIssue({ "x-internal-secret": "anything" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("credential_issuance_not_configured");
  });

  it("passes authorization gate before downstream validation", async () => {
    process.env.NODE_ENV = "production";
    const res = await postIssue({ "x-internal-secret": "test-internal-secret" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("ABRAXAS_SIGNING_KEY not configured");
  });

  it("rejects unauthenticated requests in production", async () => {
    process.env.NODE_ENV = "production";
    const res = await postIssue();
    expect(res.status).toBe(403);
  });
});
