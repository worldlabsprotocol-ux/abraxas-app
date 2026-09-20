// FILE: lib/partner/launchpad/webhookDeliveryHealth/classify.ts
// Host and failure classification. Never returns a full URL, secret, or raw error.

import { createHash } from "crypto";
import type {
  WebhookHealthFailureClass,
  WebhookHealthHostClass,
  WebhookHealthStatus,
} from "./contract";

export function classifyWebhookEndpointHost(url?: string | null): {
  host_class: WebhookHealthHostClass;
  masked_host: string | null;
} {
  const raw = url?.trim() ?? "";
  if (!raw) return { host_class: "not_configured", masked_host: null };
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) {
      return { host_class: "local_dev", masked_host: "localhost" };
    }
    if (
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.|0\.|169\.254\.)/.test(host)
      || host === "::1"
    ) {
      return { host_class: "private_network", masked_host: "private-network" };
    }
    const labels = host.split(".").filter(Boolean);
    const masked = labels.length >= 2 ? `*.${labels.slice(-2).join(".")}` : "*.host";
    if (parsed.protocol === "https:") {
      return { host_class: "public_https", masked_host: masked };
    }
    return { host_class: "unknown", masked_host: masked };
  } catch {
    return { host_class: "unknown", masked_host: null };
  }
}

export function classifyWebhookFailureClass(code?: string | null): WebhookHealthFailureClass | null {
  if (!code?.trim()) return null;
  const value = code.toLowerCase();
  if (/timeout|timed.?out|abort/.test(value)) return "timeout";
  if (/disabled|not_configured/.test(value)) return "delivery_disabled";
  if (/dns|econn|network|unsafe|ssrf|private|enotfound/.test(value)) return "endpoint_unavailable";
  if (/http_|status_|4\d\d|5\d\d/.test(value)) return "endpoint_rejected";
  return "delivery_failed";
}

export function mapOutboxStatusToHealth(status: string, enabled: boolean): WebhookHealthStatus {
  if (!enabled) return "disabled";
  if (status === "delivered") return "delivered";
  if (status === "failed") return "failed";
  return "pending";
}

export function opaqueDeliveryRef(partnerId: string, outboxId: string): string {
  return `del_${createHash("sha256").update(`${partnerId}:${outboxId}`).digest("hex").slice(0, 12)}`;
}

export function webhookHealthCopyLeaks(text: string): string[] {
  const hits: string[] = [];
  if (/abx_(test|live|whsec)_/i.test(text)) hits.push("secret");
  if (/https?:\/\/[^\s"'\\]+/i.test(text) && /\/(webhooks|callback|hooks)\//i.test(text)) hits.push("full_url");
  if (/receipt[_-]?id/i.test(text)) hits.push("receipt_id");
  if (/0x[a-f0-9]{20,}/i.test(text)) hits.push("wallet");
  if (/SQLSTATE|relation /i.test(text)) hits.push("backend");
  if (/x-abraxas-signature|hmac=/i.test(text)) hits.push("hmac");
  return hits;
}
