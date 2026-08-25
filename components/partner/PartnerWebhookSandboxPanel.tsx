"use client";
// FILE: components/partner/PartnerWebhookSandboxPanel.tsx
// Sandbox webhook status, manual test enqueue, and delivery history for the partner portal.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import type { PartnerWebhookPortalStatus } from "@/lib/partner/partnerWebhookPortalStatus";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";
import { deriveWebhookProgress } from "@/lib/partner/partnerSandboxIntegrationKit";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const WARN = "#F59E0B";
const ACCENT = "#10B981";

interface DeliveryRow {
  event_id: string;
  event_type: string;
  status: string;
  occurred_at: string;
  delivered_at: string | null;
  attempt_count: number;
  last_error_code: string | null;
}

const BLOCKED_REASON_COPY: Record<string, string> = {
  webhook_not_configured: "Webhook endpoint not yet registered by Abraxas ops.",
  delivery_not_enabled: "Webhook delivery is not enabled for your partner.",
  schema_not_ready: "Webhook schema is not ready in this environment.",
  test_enqueue_not_ready: "Sandbox test enqueue is not available until Abraxas ops apply migration 067.",
  dispatch_not_ready: "Webhook dispatch is not yet operational.",
  signing_not_ready: "Webhook signing is not yet configured.",
  missing_webhooks_read_scope: "Your API key is missing the webhooks:read scope.",
  sandbox_key_required: "Sandbox test delivery requires an abx_test_ API key.",
};

const QUEUED_SUCCESS_COPY =
  "Test event queued. Queued means accepted for delivery — check delivery history for HTTP delivered status. Delivered is transport only, not signature verification.";

const WEBHOOK_PROGRESS_STEPS = [
  { id: "queued", label: "Queued", detail: "Event accepted for async delivery" },
  { id: "delivered", label: "HTTP delivered", detail: "Your endpoint returned a successful HTTP response" },
  { id: "signature_verified", label: "Signature verified by your receiver", detail: "Manual acknowledgment — not inferred from delivery" },
] as const;

function authHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

function isSandboxTestEvent(eventType: string): boolean {
  return eventType === PARTNER_WEBHOOK_TEST_EVENT_TYPE;
}

export function PartnerWebhookSandboxPanel({
  apiKey,
  enabled = true,
  signatureVerifiedAcknowledged = false,
}: {
  apiKey: string;
  enabled?: boolean;
  signatureVerifiedAcknowledged?: boolean;
}) {
  const [status, setStatus] = useState<PartnerWebhookPortalStatus | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [queueMessage, setQueueMessage] = useState("");
  const [queueEventId, setQueueEventId] = useState("");
  const [queueError, setQueueError] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(enabled);

  const refreshData = useCallback(async () => {
    if (!enabled) return;

    setLoadError("");
    setLoading(true);
    try {
      const [statusRes, deliveriesRes] = await Promise.all([
        fetch("/api/partner/webhooks/status", { headers: authHeaders(apiKey) }),
        fetch("/api/v1/partner/webhooks/deliveries?limit=20", { headers: authHeaders(apiKey) }),
      ]);

      const statusBody = await statusRes.json() as { webhook_status?: PartnerWebhookPortalStatus; error?: string };
      const deliveriesBody = await deliveriesRes.json() as { deliveries?: DeliveryRow[]; error?: string };

      if (!statusRes.ok) {
        setStatus(null);
        setLoadError(statusBody.error ?? "Unable to load webhook status");
        return;
      }

      setStatus(statusBody.webhook_status ?? null);

      if (deliveriesRes.ok) {
        setDeliveries(deliveriesBody.deliveries ?? []);
      } else {
        setDeliveries([]);
      }
    } catch {
      setLoadError("Unable to load webhook status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [apiKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refreshData();
  }, [refreshData, enabled]);

  async function sendSandboxTest() {
    if (!status?.sandbox_test.available || sending) return;

    setSending(true);
    setQueueError("");
    setQueueMessage("");
    setQueueEventId("");

    try {
      const res = await fetch("/api/partner/webhooks/test-delivery", {
        method: "POST",
        headers: authHeaders(apiKey),
      });
      const body = await res.json() as {
        ok?: boolean;
        queued?: boolean;
        event_id?: string;
        message?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        setQueueError(body.error ?? body.code ?? "Test delivery unavailable");
        return;
      }

      if (body.queued === true) {
        setQueueMessage(body.message ?? QUEUED_SUCCESS_COPY);
        setQueueEventId(body.event_id ?? "");
        await refreshData();
        return;
      }

      setQueueError("Unexpected response from test delivery");
    } catch {
      setQueueError("Test delivery request failed");
    } finally {
      setSending(false);
    }
  }

  if (!enabled) {
    return null;
  }

  if (loading && !status) {
    return (
      <ContentCard title="Webhook sandbox">
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: 0 }}>
          Loading webhook status…
        </p>
      </ContentCard>
    );
  }

  if (loadError) {
    return (
      <ContentCard title="Webhook sandbox">
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#ef4444", margin: 0 }}>{loadError}</p>
      </ContentCard>
    );
  }

  if (!status) return null;

  const testAvailable = status.sandbox_test.available;
  const sandboxTestDeliveries = deliveries.filter((row) => isSandboxTestEvent(row.event_type));
  const hasQueuedTestEvent = sandboxTestDeliveries.some((row) =>
    ["queued", "pending", "retrying", "delivered"].includes(row.status),
  );
  const hasDeliveredTestEvent = sandboxTestDeliveries.some((row) => row.status === "delivered");
  const progressStage = deriveWebhookProgress({
    hasQueuedTestEvent: hasQueuedTestEvent || Boolean(queueEventId),
    hasDeliveredTestEvent,
    signatureVerifiedAcknowledged,
  });

  return (
    <ContentCard title="Webhook sandbox">
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: WARN, lineHeight: 1.55, margin: "0 0 0.75rem", fontWeight: 600 }}>
        {status.sandbox_notice}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
        {status.disclaimer}
      </p>

      <div
        data-testid="webhook-progress"
        style={{
          display: "grid",
          gap: "0.4rem",
          marginBottom: "0.85rem",
          padding: "0.65rem",
          borderRadius: 10,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.15rem" }}>
          Webhook test progression
        </div>
        {WEBHOOK_PROGRESS_STEPS.map((step, index) => {
          const stageOrder = ["not_started", "queued", "delivered", "signature_verified"] as const;
          const currentIndex = stageOrder.indexOf(progressStage);
          const stepIndex = index + 1;
          const done = currentIndex >= stepIndex;
          const active = currentIndex + 1 === stepIndex || (progressStage === "not_started" && index === 0 && !done);

          return (
            <div
              key={step.id}
              data-testid={`webhook-progress-${step.id}`}
              style={{
                padding: "0.45rem 0.55rem",
                borderRadius: 8,
                border: `1px solid ${done ? "rgba(16,185,129,0.35)" : active ? `${WARN}55` : "var(--border)"}`,
                background: done ? "rgba(16,185,129,0.06)" : "transparent",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: done ? ACCENT : "var(--text-primary)" }}>
                {done ? "✓" : "○"} {step.label}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                {step.detail}
              </p>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.85rem" }}>
        {[
          {
            label: "Webhook configured",
            done: status.webhook_configured,
            detail: status.webhook_configured
              ? "Callback endpoint registered by Abraxas ops"
              : "Contact Abraxas ops to register your HTTPS callback",
          },
          {
            label: "Delivery enabled",
            done: status.webhook_delivery_enabled,
            detail: status.webhook_delivery_enabled
              ? "Outbound delivery is enabled"
              : "Delivery must be enabled by Abraxas ops after you verify signatures",
          },
          {
            label: "webhooks:read scope",
            done: status.has_webhooks_read_scope,
            detail: status.has_webhooks_read_scope
              ? "This key can read delivery history"
              : "Request a key with webhooks:read from Abraxas ops",
          },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              padding: "0.6rem 0.75rem",
              borderRadius: 10,
              border: `1px solid ${row.done ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
              background: row.done ? "rgba(16,185,129,0.06)" : "transparent",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, color: row.done ? ACCENT : "var(--text-primary)" }}>
              {row.done ? "✓" : "○"} {row.label}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
              {row.detail}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "0.75rem",
          borderRadius: 10,
          border: "1px solid var(--border)",
          marginBottom: "0.85rem",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, marginBottom: "0.35rem" }}>
          Sandbox test event
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 0.5rem" }}>
          Sends a single <code style={{ fontFamily: MONO, fontSize: "0.65rem" }}>{PARTNER_WEBHOOK_TEST_EVENT_TYPE}</code>{" "}
          event with <code style={{ fontFamily: MONO, fontSize: "0.65rem" }}>test: true</code>.
          This is not a Partner Flow lifecycle notification and is not validated via the public receipt API.
        </p>

        {!testAvailable && status.sandbox_test.blocked_reasons.length > 0 && (
          <ul style={{ margin: "0 0 0.65rem", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            {status.sandbox_test.blocked_reasons.map((reason) => (
              <li key={reason}>{BLOCKED_REASON_COPY[reason] ?? reason}</li>
            ))}
          </ul>
        )}

        <button
          type="button"
          data-testid="sandbox-test-button"
          disabled={!testAvailable || sending}
          onClick={() => void sendSandboxTest()}
          style={{
            padding: "0.55rem 0.9rem",
            borderRadius: 10,
            border: "none",
            background: testAvailable ? "var(--accent)" : "var(--surface-inset)",
            color: testAvailable ? "#1a1408" : "var(--text-muted)",
            fontFamily: FONT,
            fontSize: "0.76rem",
            fontWeight: 700,
            cursor: testAvailable && !sending ? "pointer" : "not-allowed",
          }}
        >
          {sending ? "Queueing…" : "Send sandbox test event"}
        </button>

        {queueMessage && (
          <p
            data-testid="sandbox-test-success"
            style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, margin: "0.65rem 0 0", lineHeight: 1.55 }}
          >
            {queueMessage}
            {queueEventId ? (
              <>
                {" "}
                <span style={{ fontFamily: MONO, fontSize: "0.62rem" }}>event_id: {queueEventId}</span>
              </>
            ) : null}
          </p>
        )}
        {queueError && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#ef4444", margin: "0.65rem 0 0" }}>
            {queueError}
          </p>
        )}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800 }}>Delivery history</div>
          <button
            type="button"
            onClick={() => void refreshData()}
            style={{
              padding: "0.3rem 0.55rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontFamily: FONT,
              fontSize: "0.68rem",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
          Status <strong>delivered</strong> means HTTP delivery succeeded only. Signature verification is your responsibility.
          Automatic retries run on schedule. Manual requeue is operator-only.
        </p>

        {deliveries.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
            No delivery records yet.
          </p>
        ) : (
          <div data-testid="delivery-history-table" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "0.35rem" }}>Time</th>
                  <th style={{ textAlign: "left", padding: "0.35rem" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "0.35rem" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "0.35rem" }}>Attempts</th>
                  <th style={{ textAlign: "left", padding: "0.35rem" }}>Last error</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row) => (
                  <tr key={row.event_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.35rem", fontFamily: MONO, fontSize: "0.6rem" }}>
                      {new Date(row.occurred_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.35rem" }}>
                      <span style={{
                        padding: "0.15rem 0.4rem",
                        borderRadius: 6,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        background: isSandboxTestEvent(row.event_type) ? `${WARN}22` : "var(--surface-inset)",
                        color: isSandboxTestEvent(row.event_type) ? WARN : "var(--text-secondary)",
                      }}>
                        {isSandboxTestEvent(row.event_type) ? "Sandbox test" : "Partner event"}
                      </span>
                    </td>
                    <td style={{ padding: "0.35rem" }}>{row.status}</td>
                    <td style={{ padding: "0.35rem" }}>{row.attempt_count}</td>
                    <td style={{ padding: "0.35rem", fontFamily: MONO, fontSize: "0.6rem" }}>
                      {row.last_error_code ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.85rem 0 0" }}>
        <Link href="/docs/partner-flow#webhook-sandbox" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          Webhook sandbox guide →
        </Link>
      </p>
    </ContentCard>
  );
}
