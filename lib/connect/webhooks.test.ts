// FILE: lib/connect/webhooks.test.ts
import { describe, it, expect } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookPayload,
  WEBHOOK_REPLAY_WINDOW_MS,
} from "@/lib/connect/webhooks";

describe("webhook replay protection", () => {
  const secret = "test-signing-secret";
  const body = JSON.stringify({ event: "authorization.completed", status: "approved" });

  it("signs timestamp.body", () => {
    const timestamp = "2026-07-09T12:00:00.000Z";
    const sig = signWebhookPayload(secret, timestamp, body);
    expect(sig).toHaveLength(64);
    expect(sig).not.toBe(signWebhookPayload(secret, body, body));
  });

  it("accepts a fresh payload", () => {
    const timestamp = new Date().toISOString();
    const signature = signWebhookPayload(secret, timestamp, body);
    const result = verifyWebhookPayload(secret, timestamp, body, signature);
    expect(result.ok).toBe(true);
  });

  it("rejects replay outside the time window", () => {
    const timestamp = new Date(Date.now() - WEBHOOK_REPLAY_WINDOW_MS - 1000).toISOString();
    const signature = signWebhookPayload(secret, timestamp, body);
    const result = verifyWebhookPayload(secret, timestamp, body, signature);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timestamp_outside_window");
  });

  it("rejects tampered body", () => {
    const timestamp = new Date().toISOString();
    const signature = signWebhookPayload(secret, timestamp, body);
    const result = verifyWebhookPayload(secret, timestamp, `${body}tampered`, signature);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_signature");
  });
});
