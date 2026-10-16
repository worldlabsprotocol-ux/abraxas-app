"use client";

import { useEffect, useState } from "react";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  useIntegrationStudioOperational,
  type IntegrationStudioInspectorFocus,
} from "@/components/developers/integrationStudioOperationalContext";
import {
  integrationInspectorStatusMessage,
  resolveIntegrationInspectorLoadState,
} from "@/components/developers/integrationStudioInspectorStatus";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type HealthPayload = {
  checks?: Array<{ id: string; label: string; status: string; detail?: string }>;
  production_access_request_status?: string | null;
  webhook?: { configured?: boolean; last_delivery_status?: string | null };
};

type WebhookHealthPayload = {
  available?: boolean;
  deliveries?: Array<{ id: string; status: string; created_at?: string }>;
  error?: string;
};

const FOCUS_TABS: { id: IntegrationStudioInspectorFocus; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sandbox", label: "Sandbox" },
  { id: "response", label: "Response" },
  { id: "receipt", label: "Receipt" },
  { id: "webhook", label: "Webhooks" },
  { id: "production", label: "Production" },
];

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) {
    return <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>No payload yet.</p>;
  }
  return (
    <pre
      className="abx-code-scroll"
      style={{
        fontFamily: MONO,
        fontSize: "0.62rem",
        margin: 0,
        maxHeight: 220,
        overflow: "auto",
        padding: "0.55rem",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function IntegrationStudioInspectorRail() {
  const {
    applicationId,
    signedIn,
    inspectorFocus,
    setInspectorFocus,
    lastHttpTrace,
  } = useIntegrationStudioOperational();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthError, setHealthError] = useState("");
  const [webhookHealth, setWebhookHealth] = useState<WebhookHealthPayload | null>(null);
  const [webhookError, setWebhookError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!applicationId || !signedIn) {
      setHealth(null);
      setWebhookHealth(null);
      setHealthError("");
      setWebhookError("");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setHealthError("");
      setWebhookError("");
      try {
        const [healthRes, whRes] = await Promise.all([
          fetch(`/api/launchpad/applications/${applicationId}/health`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/launchpad/applications/${applicationId}/webhook-delivery-health`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        const healthData = (await healthRes.json()) as HealthPayload & { error?: string };
        const whData = (await whRes.json()) as WebhookHealthPayload;
        if (cancelled) return;
        if (!healthRes.ok) {
          setHealth(null);
          setHealthError(healthData.error ?? "Integration health unavailable (sign in with sandbox API key).");
        } else {
          setHealth(healthData);
        }
        if (!whRes.ok) {
          setWebhookHealth(null);
          setWebhookError(whData.error ?? "Webhook diagnostics unavailable.");
        } else {
          setWebhookHealth(whData);
        }
      } catch {
        if (!cancelled) {
          setHealthError("Could not load integration status.");
          setWebhookError("Could not load webhook diagnostics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, signedIn]);

  const receiptFromTrace =
    lastHttpTrace?.response && typeof lastHttpTrace.response === "object"
      ? (lastHttpTrace.response as Record<string, unknown>).receipt
        ?? (lastHttpTrace.response as Record<string, unknown>).signed_receipt
        ?? null
      : null;

  const loadState = resolveIntegrationInspectorLoadState({
    applicationId,
    signedIn,
    loading,
    healthError,
    health,
  });
  const statusMessage = integrationInspectorStatusMessage(loadState);
  const showLiveStatus =
    loadState === "loaded" || loadState === "loading" || loadState === "health_error";

  return (
    <div className="abx-studio-inspector" aria-label="Integration inspector">
      <h2 className="abx-studio-inspector__header">Integration inspector</h2>
      <div className="abx-studio-inspector__tabs" role="tablist" aria-label="Inspector sections">
        {FOCUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={inspectorFocus === tab.id}
            className={
              inspectorFocus === tab.id
                ? "abx-studio-inspector__tab abx-studio-inspector__tab--active"
                : "abx-studio-inspector__tab"
            }
            onClick={() => setInspectorFocus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showLiveStatus ? (
        <p
          role="status"
          aria-live="polite"
          className={`abx-studio-inspector__status abx-studio-inspector__status--${loadState}`}
          style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.65rem", lineHeight: 1.5 }}
        >
          {loadState === "health_error" ? healthError : statusMessage}
        </p>
      ) : statusMessage ? (
        <p
          className={`abx-studio-inspector__status abx-studio-inspector__status--${loadState}`}
          style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.65rem", lineHeight: 1.5, color: "var(--text-secondary)" }}
        >
          {statusMessage}
        </p>
      ) : null}

      <div key={inspectorFocus} className="abx-studio-inspector__panel">
      {applicationId && !signedIn && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--warning, #f59e0b)", lineHeight: 1.55, marginTop: "0.25rem" }}>
          Application <code style={{ fontFamily: MONO }}>{applicationId.slice(0, 8)}…</code> is stored locally. Sign in with your sandbox API key to fetch live health and run authenticated harness requests.
        </p>
      )}

      {inspectorFocus === "overview" && health && (
        <ul style={{ fontFamily: FONT, fontSize: "0.72rem", paddingLeft: "1rem", margin: "0.75rem 0 0", display: "grid", gap: "0.35rem" }}>
          {(health.checks ?? []).slice(0, 6).map((check) => (
            <li key={check.id}>
              <strong>{check.label}</strong>: {check.status.replace(/_/g, " ")}
              {check.detail ? `. ${check.detail}` : ""}
            </li>
          ))}
        </ul>
      )}

      {inspectorFocus === "overview" && healthError && loadState !== "health_error" && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)", marginTop: "0.75rem" }}>{healthError}</p>
      )}

      {inspectorFocus === "sandbox" && applicationId && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.35rem" }}>
            Sandbox credential status comes from Launchpad key records. It is not simulated in the studio.
          </p>
          {health?.webhook?.configured != null && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: 0 }}>
              Webhook endpoint: {health.webhook.configured ? "configured" : "not configured"}
            </p>
          )}
        </div>
      )}

      {inspectorFocus === "response" && (
        <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
          <div>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, margin: "0 0 0.25rem" }}>Request</p>
            <JsonBlock value={lastHttpTrace?.request ?? null} />
          </div>
          <div>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, margin: "0 0 0.25rem" }}>Response</p>
            <JsonBlock value={lastHttpTrace?.response ?? null} />
          </div>
          {lastHttpTrace?.at && (
            <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--text-muted)", margin: 0 }}>{lastHttpTrace.at}</p>
          )}
        </div>
      )}

      {inspectorFocus === "receipt" && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.35rem" }}>
            Signed receipt material from the last harness response only. Verify independently on the workbench.
          </p>
          <JsonBlock value={receiptFromTrace} />
        </div>
      )}

      {inspectorFocus === "webhook" && (
        <div style={{ marginTop: "0.75rem" }}>
          {webhookError && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }}>{webhookError}</p>
          )}
          {webhookHealth?.available === false && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Webhook telemetry unavailable for this application (not the same as zero deliveries).
            </p>
          )}
          {webhookHealth?.deliveries?.length ? (
            <ul style={{ fontFamily: FONT, fontSize: "0.68rem", paddingLeft: "1rem", margin: 0, display: "grid", gap: "0.25rem" }}>
              {webhookHealth.deliveries.slice(0, 8).map((row) => (
                <li key={row.id}>
                  {row.status.replace(/_/g, " ")}
                  {row.created_at ? ` · ${row.created_at}` : ""}
                </li>
              ))}
            </ul>
          ) : webhookHealth && webhookHealth.available !== false ? (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>No recorded deliveries in the loaded window.</p>
          ) : null}
        </div>
      )}

      {inspectorFocus === "production" && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", lineHeight: 1.55 }}>
            Production activation requires operator review. Status is authoritative from Launchpad and is never self-promoted from sandbox.
          </p>
          <p style={{ fontFamily: MONO, fontSize: "0.68rem", margin: "0.5rem 0 0" }}>
            Review: {health?.production_access_request_status ?? "none submitted"}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
