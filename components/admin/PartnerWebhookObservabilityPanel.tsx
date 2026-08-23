"use client";
// FILE: components/admin/PartnerWebhookObservabilityPanel.tsx
// Read-only Production-session webhook delivery observability for a selected partner.

import { Fragment, useState } from "react";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";
const WARN = "#FBBF24";

interface ObservabilityDelivery {
  event_id: string;
  event_type: string;
  status: string;
  delivery_state: string;
  occurred_at: string;
  delivered_at: string | null;
  attempt_count: number;
  last_error_code: string | null;
}

interface ObservabilitySnapshot {
  partner_id: string;
  webhook_configured: boolean;
  webhook_delivery_enabled: boolean;
  status_counts: {
    pending: number;
    delivering: number;
    retrying: number;
    delivered: number;
    failed: number;
    unknown: number;
  };
  dispatch_summary_available: boolean;
  dispatch_summary?: {
    scheduler_ready: boolean;
    last_successful_run_at: string | null;
    last_failure_at: string | null;
    last_failure_error_code: string | null;
  };
  follow_up: {
    recommended: boolean;
    reasons: string[];
  };
  deliveries: ObservabilityDelivery[];
  disclaimer: string;
}

interface AttemptRow {
  attempt_number: number;
  http_status: number | null;
  error_code: string | null;
  attempted_at: string;
}

const SCHEDULER_UNAVAILABLE_COPY = "Scheduler context unavailable in this environment.";

function isSandboxTestEvent(eventType: string): boolean {
  return eventType === PARTNER_WEBHOOK_TEST_EVENT_TYPE;
}

export function PartnerWebhookObservabilityPanel() {
  const gate = useProductionAdminSessionGate();
  const [partnerInput, setPartnerInput] = useState("");
  const [loadedPartnerId, setLoadedPartnerId] = useState("");
  const [snapshot, setSnapshot] = useState<ObservabilitySnapshot | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [attemptsByEvent, setAttemptsByEvent] = useState<Record<string, AttemptRow[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadObservability() {
    const partnerId = partnerInput.trim();
    if (!partnerId) return;

    setLoading(true);
    setError("");
    setSnapshot(null);
    setExpandedEventId(null);
    setAttemptsByEvent({});

    try {
      const res = await gate.adminRequest(
        `/api/admin/partners/webhooks/observability?partner_id=${encodeURIComponent(partnerId)}`,
        { cache: "no-store" },
      );

      if (res.status === 401 && !gate.usePinUnlock) {
        setError(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
        return;
      }

      const body = await res.json() as { observability?: ObservabilitySnapshot; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Observability unavailable");
        return;
      }

      setLoadedPartnerId(partnerId);
      setSnapshot(body.observability ?? null);
    } catch {
      setError("Observability unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAttempts(eventId: string) {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      return;
    }

    if (attemptsByEvent[eventId]) {
      setExpandedEventId(eventId);
      return;
    }

    if (!loadedPartnerId) return;

    const res = await gate.adminRequest(
      `/api/admin/partners/webhooks/observability?partner_id=${encodeURIComponent(loadedPartnerId)}&event_id=${encodeURIComponent(eventId)}`,
      { cache: "no-store" },
    );
    const body = await res.json() as { attempts?: AttemptRow[]; error?: string };
    if (!res.ok) {
      setError(body.error ?? "Delivery not found");
      return;
    }

    setAttemptsByEvent((current) => ({
      ...current,
      [eventId]: body.attempts ?? [],
    }));
    setExpandedEventId(eventId);
  }

  if (gate.loading) {
    return <p style={mutedStyle}>Checking admin session…</p>;
  }

  if (!gate.authorized && !gate.usePinUnlock) {
    return <p style={mutedStyle}>{PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE}</p>;
  }

  if (!gate.authorized) {
    return (
      <p style={mutedStyle}>
        Sign in via the admin layout gate to view delivery observability.
      </p>
    );
  }

  return (
    <div>
      <ProductionAdminSessionStatus gate={gate} />

      <p style={{ ...mutedStyle, margin: "0.75rem 0" }}>
        Read-only delivery observability. Select a partner and click Load. No endpoint URLs, secrets, or payloads are shown.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <input
          type="text"
          value={partnerInput}
          onChange={(e) => setPartnerInput(e.target.value)}
          placeholder="partner_id"
          data-testid="observability-partner-input"
          style={inputStyle}
        />
        <button
          type="button"
          data-testid="observability-load-button"
          onClick={() => void loadObservability()}
          disabled={!partnerInput.trim() || loading || !gate.authorized}
          style={buttonStyle}
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {error && <p style={{ color: "#f87171", fontFamily: FONT, fontSize: "0.76rem" }}>{error}</p>}

      {snapshot && (
        <>
          <div style={cardStyle}>
            <div style={{ fontFamily: FONT, fontWeight: 800, marginBottom: "0.5rem" }}>Configuration</div>
            <p style={mutedStyle}>
              Webhook configured: {snapshot.webhook_configured ? "yes" : "no"}
              {" · "}
              Delivery enabled: {snapshot.webhook_delivery_enabled ? "yes" : "no"}
            </p>
            {snapshot.follow_up.recommended && (
              <p style={{ ...mutedStyle, color: WARN, fontWeight: 600 }}>
                Operator follow-up recommended ({snapshot.follow_up.reasons.join(", ")})
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ fontFamily: FONT, fontWeight: 800, marginBottom: "0.5rem" }}>Status counts</div>
            <p style={monoStyle}>
              pending {snapshot.status_counts.pending} · delivering {snapshot.status_counts.delivering} · retrying {snapshot.status_counts.retrying} · delivered {snapshot.status_counts.delivered} · failed {snapshot.status_counts.failed}
              {snapshot.status_counts.unknown > 0 ? ` · unknown ${snapshot.status_counts.unknown}` : ""}
            </p>
            <p style={mutedStyle}>{snapshot.disclaimer}</p>
          </div>

          <div style={cardStyle}>
            <div style={{ fontFamily: FONT, fontWeight: 800, marginBottom: "0.5rem" }}>Dispatch context</div>
            {snapshot.dispatch_summary_available && snapshot.dispatch_summary ? (
              <p style={mutedStyle}>
                Scheduler ready: {snapshot.dispatch_summary.scheduler_ready ? "yes" : "no"}
                {" · "}
                Last success: {snapshot.dispatch_summary.last_successful_run_at ?? "never"}
                {snapshot.dispatch_summary.last_failure_error_code
                  ? ` · Last failure code: ${snapshot.dispatch_summary.last_failure_error_code}`
                  : ""}
              </p>
            ) : (
              <p data-testid="scheduler-unavailable-copy" style={{ ...mutedStyle, color: WARN }}>
                {SCHEDULER_UNAVAILABLE_COPY}
              </p>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ fontFamily: FONT, fontWeight: 800, marginBottom: "0.5rem" }}>Delivery history</div>
            {snapshot.deliveries.length === 0 ? (
              <p style={mutedStyle}>No delivery records for this partner.</p>
            ) : (
              <div data-testid="observability-delivery-table" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.74rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                      <th style={thStyle}>Time</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Attempts</th>
                      <th style={thStyle}>Last error</th>
                      <th style={thStyle}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.deliveries.map((row) => (
                      <Fragment key={row.event_id}>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <td style={tdStyle}>{new Date(row.occurred_at).toLocaleString()}</td>
                          <td style={tdStyle}>
                            {isSandboxTestEvent(row.event_type) ? "Sandbox test" : "Partner event"}
                          </td>
                          <td style={tdStyle}>{row.status}</td>
                          <td style={tdStyle}>{row.attempt_count}</td>
                          <td style={tdStyle}>{row.last_error_code ?? "—"}</td>
                          <td style={tdStyle}>
                            <button
                              type="button"
                              data-testid={`expand-attempts-${row.event_id}`}
                              onClick={() => void toggleAttempts(row.event_id)}
                              style={linkButtonStyle}
                            >
                              {expandedEventId === row.event_id ? "Hide attempts" : "View attempts"}
                            </button>
                          </td>
                        </tr>
                        {expandedEventId === row.event_id && (
                          <tr key={`${row.event_id}-attempts`}>
                            <td colSpan={6} style={{ ...tdStyle, background: "rgba(255,255,255,0.03)" }}>
                              {(attemptsByEvent[row.event_id] ?? []).length === 0 ? (
                                <span style={mutedStyle}>No attempt rows recorded.</span>
                              ) : (
                                <div style={monoStyle}>
                                  {(attemptsByEvent[row.event_id] ?? []).map((attempt) => (
                                    <div key={`${row.event_id}-${attempt.attempt_number}`}>
                                      #{attempt.attempt_number} · {attempt.error_code ?? "ok"} · {attempt.http_status ?? "—"} · {new Date(attempt.attempted_at).toLocaleString()}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const mutedStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.76rem",
  color: "rgba(255,255,255,0.65)",
  lineHeight: 1.55,
  margin: 0,
};

const monoStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.68rem",
  color: "rgba(255,255,255,0.75)",
  lineHeight: 1.55,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  flex: "1 1 220px",
  padding: "0.55rem 0.75rem",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0f0f0",
  fontFamily: MONO,
  fontSize: "0.72rem",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  borderRadius: 8,
  border: "none",
  background: ACCENT,
  color: "#04130e",
  fontFamily: FONT,
  fontSize: "0.76rem",
  fontWeight: 700,
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: ACCENT,
  fontFamily: FONT,
  fontSize: "0.72rem",
  cursor: "pointer",
  padding: 0,
};

const cardStyle: React.CSSProperties = {
  padding: "0.85rem",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  marginBottom: "0.75rem",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.35rem",
  color: "rgba(255,255,255,0.55)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.35rem",
  verticalAlign: "top",
};
