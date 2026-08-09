import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyDispatcherError,
  dispatcherErrorMetadata,
  fingerprintDispatcherError,
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
});
