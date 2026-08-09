import { describe, expect, it, vi } from "vitest";
import {
  classifyDispatcherError,
  dispatcherErrorMetadata,
  fingerprintDispatcherError,
  logSafeOperationalError,
} from "@/lib/partner/webhooks/webhookDispatchError";

describe("webhook dispatch error classification", () => {
  it("maps database failures to database_error", () => {
    const result = classifyDispatcherError(new Error("supabase relation partner_webhook_outbox missing"));
    expect(result.category).toBe("database_error");
    expect(result.fingerprint).toHaveLength(16);
  });

  it("maps unknown failures to internal_error", () => {
    const result = classifyDispatcherError(new Error("something unexpected"));
    expect(result.category).toBe("internal_error");
  });

  it("never exposes raw messages in alert metadata", () => {
    const secret = "Bearer sk_live_supersecret https://partner.example/webhook?token=abc";
    const metadata = dispatcherErrorMetadata(new Error(secret));
    expect(metadata.error_category).toBe("internal_error");
    expect(metadata.error_fingerprint).toBe(fingerprintDispatcherError(secret));
    expect(JSON.stringify(metadata)).not.toContain("sk_live");
    expect(JSON.stringify(metadata)).not.toContain("https://");
    expect(JSON.stringify(metadata)).not.toContain("partner.example");
  });

  it("logs only safe category and fingerprint, never raw exception text", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secret = "postgres connection failed: https://internal.example/db?token=abc";

    logSafeOperationalError("test.operation", new Error(secret));

    expect(errorSpy).toHaveBeenCalledWith(
      "[test.operation]",
      expect.objectContaining({
        error_category: "database_error",
        error_fingerprint: fingerprintDispatcherError(secret),
      }),
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("internal.example");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("token=abc");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("postgres connection failed");

    errorSpy.mockRestore();
  });
});
