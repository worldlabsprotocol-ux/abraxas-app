"use client";
// FILE: components/admin/PartnerWebhooksPanel.tsx
// Admin partner webhook configuration, dispatch health, and dead-letter recovery.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";
import {
  isWebhookHttpsEndpointWellFormed,
  webhookEndpointFormErrorMessage,
} from "@/lib/partner/webhooks/webhookEndpointFormValidation";
import type { ProductionAdminRequest } from "@/lib/admin/productionAdminSessionUi";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";
const WARN = "#FBBF24";

interface WebhookConfig {
  partner_id: string;
  endpoint_url: string;
  signing_secret_prefix: string;
  enabled: boolean;
  enabled_at: string | null;
}

interface HealthCounts {
  pending: number;
  delivering: number;
  delivered: number;
  retrying: number;
  failed: number;
}

interface DispatchHealth {
  scheduler_configured: boolean;
  cron_secret_configured: boolean;
  scheduler_message: string;
  last_successful_run_at: string | null;
  last_failure_at: string | null;
  last_failure_error_code: string | null;
}

interface AlertsStatus {
  enabled: boolean;
  configured: boolean;
  recipient_count: number;
  message: string;
  missing: string[];
}

interface ActiveAlert {
  alert_key: string;
  updated_at: string;
  safe_metadata: Record<string, string | number | boolean | null>;
}

interface FailedDelivery {
  outbox_id: string;
  partner_id: string;
  event_type: string;
  event_id: string;
  last_error_code: string | null;
  attempt_count: number;
  occurred_at: string;
  updated_at: string;
}

const SETUP_STEPS = [
  "Save endpoint",
  "Copy signing secret once",
  "Partner configures signature verification",
  "Explicitly enable deliveries",
];

function formatTs(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function PartnerWebhooksPanel({ adminRequest }: { adminRequest: ProductionAdminRequest }) {
  const [partnerId, setPartnerId] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [configs, setConfigs] = useState<WebhookConfig[]>([]);
  const [health, setHealth] = useState<HealthCounts | null>(null);
  const [dispatch, setDispatch] = useState<DispatchHealth | null>(null);
  const [alerts, setAlerts] = useState<AlertsStatus | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [failedDeliveries, setFailedDeliveries] = useState<FailedDelivery[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [secretReveal, setSecretReveal] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [endpointError, setEndpointError] = useState("");
  const [loading, setLoading] = useState(false);
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const endpointValidation = useMemo(
    () => isWebhookHttpsEndpointWellFormed(endpointUrl),
    [endpointUrl],
  );

  const canSaveEndpoint = Boolean(
    partnerId.trim()
    && endpointUrl.trim()
    && endpointValidation.ok,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const failedUrl = partnerId.trim()
        ? `/api/admin/partners/webhooks/failed-deliveries?partner_id=${encodeURIComponent(partnerId.trim())}`
        : "/api/admin/partners/webhooks/failed-deliveries";

      const [configRes, healthRes, failedRes] = await Promise.all([
        adminRequest("/api/admin/partners/webhooks"),
        adminRequest("/api/admin/partners/webhooks/delivery-health"),
        adminRequest(failedUrl),
      ]);

      const configBody = await configRes.json() as { configs?: WebhookConfig[]; disclaimer?: string; error?: string; message?: string };
      const healthBody = await healthRes.json() as {
        counts?: HealthCounts;
        dispatch?: DispatchHealth;
        alerts?: AlertsStatus;
        alerts_configured?: boolean;
        active_alerts?: ActiveAlert[];
        error?: string;
      };
      const failedBody = await failedRes.json() as { deliveries?: FailedDelivery[]; error?: string };

      if (!configRes.ok) throw new Error(configBody.message ?? configBody.error ?? "Failed to load webhook configs");
      if (!healthRes.ok) throw new Error(healthBody.error ?? "Failed to load delivery health");
      if (!failedRes.ok) throw new Error(failedBody.error ?? "Failed to load failed deliveries");

      setConfigs(configBody.configs ?? []);
      setDisclaimer(configBody.disclaimer ?? "");
      setHealth(healthBody.counts ?? null);
      setDispatch(healthBody.dispatch ?? null);
      setAlerts(healthBody.alerts ?? null);
      setActiveAlerts(healthBody.active_alerts ?? []);
      setFailedDeliveries(failedBody.deliveries ?? []);

      const existing = configBody.configs?.find(c => c.partner_id === partnerId.trim());
      if (existing) setEndpointUrl(existing.endpoint_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [adminRequest, partnerId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!endpointUrl.trim()) {
      setEndpointError("");
      return;
    }
    if (!endpointValidation.ok) {
      setEndpointError(endpointValidation.error);
    } else {
      setEndpointError("");
    }
  }, [endpointUrl, endpointValidation]);

  async function saveEndpoint() {
    if (!canSaveEndpoint) return;
    setLoading(true);
    setError("");
    setNotice("");
    setSecretReveal("");
    try {
      const res = await adminRequest("/api/admin/partners/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId.trim(), endpoint_url: endpointUrl.trim() }),
      });
      const body = await res.json() as { signing_secret?: string; notice?: string; error?: string; message?: string };
      if (!res.ok) throw new Error(body.message ?? webhookEndpointFormErrorMessage(body.error ?? "Save failed"));
      if (body.signing_secret) setSecretReveal(body.signing_secret);
      setNotice(body.notice ?? "Endpoint saved. Webhooks remain disabled until you enable them.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(enabled: boolean) {
    setLoading(true);
    setError("");
    try {
      const res = await adminRequest("/api/admin/partners/webhooks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId.trim(), enabled }),
      });
      const body = await res.json() as { error?: string; message?: string };
      if (!res.ok) throw new Error(body.message ?? body.error ?? "Update failed");
      setNotice(enabled ? "Delivery enabled for this partner." : "Delivery disabled.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function executeRotateSecret() {
    setLoading(true);
    setError("");
    setSecretReveal("");
    try {
      const res = await adminRequest("/api/admin/partners/webhooks/rotate-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId.trim() }),
      });
      const body = await res.json() as { signing_secret?: string; notice?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Rotate failed");
      setSecretReveal(body.signing_secret ?? "");
      setNotice(body.notice ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rotate failed");
    } finally {
      setLoading(false);
    }
  }

  function promptRotateSecret() {
    if (!partnerId.trim()) return;
    requestConfirm({
      actionKey: "webhook.rotate_secret",
      context: { partnerId: partnerId.trim() },
      onConfirmed: () => executeRotateSecret(),
    });
  }

  async function retryFailed(outboxId: string) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await adminRequest("/api/admin/partners/webhooks/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outbox_id: outboxId }),
      });
      const body = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(body.message ?? webhookEndpointFormErrorMessage(body.error ?? "Retry failed"));
      setNotice(body.message ?? "Delivery requeued.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setLoading(false);
    }
  }

  const selected = configs.find(c => c.partner_id === partnerId.trim());

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
        {disclaimer || "Webhook notifications are not proof of access. Partners must re-fetch public receipts and validate currently_valid."}
      </p>

      <section style={{ display: "grid", gap: "0.5rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#f0f0f0", margin: 0 }}>Dispatch health</h3>
        {dispatch && (
          <div style={{ display: "grid", gap: "0.35rem", fontFamily: MONO, fontSize: "0.65rem", color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color: dispatch.scheduler_configured ? ACCENT : WARN }}>
              {dispatch.scheduler_message}
            </span>
            <span>Last successful run: {formatTs(dispatch.last_successful_run_at)}</span>
            <span>Last failure: {formatTs(dispatch.last_failure_at)}{dispatch.last_failure_error_code ? ` (${dispatch.last_failure_error_code})` : ""}</span>
            {alerts && (
              <span style={{ color: alerts.configured ? ACCENT : WARN }}>
                {alerts.message}
                {alerts.configured && alerts.recipient_count > 0
                  ? ` · ${alerts.recipient_count} recipient(s)`
                  : ""}
              </span>
            )}
            {activeAlerts.length > 0 && (
              <span style={{ color: WARN }}>
                Active alerts: {activeAlerts.map(item => item.alert_key.replaceAll("_", " ")).join(", ")}
              </span>
            )}
            {alerts && !alerts.configured && (
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                Status is shown here only until alerting is fully configured.
              </span>
            )}
          </div>
        )}
        {health && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["pending", "retrying", "failed", "delivering", "delivered"] as const).map(status => (
              <span key={status} style={{
                fontFamily: MONO, fontSize: "0.62rem", padding: "0.3rem 0.55rem", borderRadius: 999,
                border: `1px solid ${status === "failed" && health.failed > 0 ? "#FCA5A555" : "rgba(255,255,255,0.12)"}`,
                color: status === "failed" && health.failed > 0 ? "#FCA5A5" : "rgba(255,255,255,0.75)",
              }}>
                {status}: {health[status]}
              </span>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: "0.65rem", maxWidth: 720 }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#f0f0f0", margin: 0 }}>Partner webhook setup</h3>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
          You need a real onboarded partner ID and that partner&apos;s HTTPS webhook URL.
        </p>
        <ol style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          {SETUP_STEPS.map((step, index) => (
            <li key={step}>{index + 1}. {step}</li>
          ))}
        </ol>
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: WARN, margin: 0 }}>
          Webhooks stay disabled by default until you explicitly enable deliveries (step 4).
        </p>

        <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
          Partner ID
          <input value={partnerId} onChange={e => setPartnerId(e.target.value)} placeholder="partner-slug"
            style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem" }} />
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
          HTTPS webhook URL
          <input value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder="https://partner.example/webhooks/abraxas"
            style={{ display: "block", width: "100%", marginTop: "0.35rem", padding: "0.55rem 0.75rem", borderRadius: 8, border: `1px solid ${endpointError ? "#FCA5A555" : "rgba(255,255,255,0.12)"}`, background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem" }} />
        </label>
        {endpointError && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#FCA5A5", margin: 0 }}>{endpointError}</p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" disabled={loading || !canSaveEndpoint} onClick={() => void saveEndpoint()}
            style={{ padding: "0.45rem 0.85rem", borderRadius: 8, border: "none", background: canSaveEndpoint ? ACCENT : "rgba(255,255,255,0.12)", color: canSaveEndpoint ? "#000" : "rgba(255,255,255,0.35)", fontWeight: 700, cursor: canSaveEndpoint ? "pointer" : "not-allowed" }}>
            Save HTTPS endpoint
          </button>
          {selected && (
            <button type="button" disabled={loading} onClick={() => void toggleEnabled(!selected.enabled)}
              style={{ padding: "0.45rem 0.85rem", borderRadius: 8, border: `1px solid ${ACCENT}55`, background: "transparent", color: ACCENT, cursor: "pointer" }}>
              {selected.enabled ? "Disable delivery" : "Enable delivery"}
            </button>
          )}
          {selected && (
            <button type="button" disabled={loading || confirmDialogProps.busy} onClick={() => promptRotateSecret()}
              style={{ padding: "0.45rem 0.85rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f0f0f0", cursor: "pointer" }}>
              Rotate signing secret
            </button>
          )}
        </div>
      </section>

      {selected && (
        <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
          Secret prefix {selected.signing_secret_prefix} · {selected.enabled ? "enabled" : "disabled (default)"}
        </p>
      )}

      <section style={{ display: "grid", gap: "0.5rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#f0f0f0", margin: 0 }}>Failed deliveries</h3>
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
          Metadata only — no payloads, secrets, or response bodies. Manual retry requeues the same event ID without creating a new receipt.
        </p>
        {failedDeliveries.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>No failed deliveries.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {failedDeliveries.map(item => (
              <div key={item.outbox_id} style={{
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.65rem 0.75rem",
                display: "grid", gap: "0.35rem",
              }}>
                <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.75)" }}>
                  {item.partner_id} · {item.event_type}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: "rgba(255,255,255,0.55)" }}>
                  event_id {item.event_id}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: "#FCA5A5" }}>
                  {item.last_error_code ?? "unknown_error"} · attempts {item.attempt_count}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "rgba(255,255,255,0.4)" }}>
                  occurred {formatTs(item.occurred_at)} · updated {formatTs(item.updated_at)}
                </div>
                <button type="button" disabled={loading || !selected?.enabled || selected.partner_id !== item.partner_id}
                  onClick={() => void retryFailed(item.outbox_id)}
                  style={{ justifySelf: "start", padding: "0.35rem 0.7rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#f0f0f0", fontSize: "0.65rem", cursor: "pointer" }}>
                  Retry delivery
                </button>
                {selected?.partner_id !== item.partner_id && (
                  <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.4)" }}>
                    Select this partner and enable delivery to retry.
                  </span>
                )}
                {selected?.partner_id === item.partner_id && !selected.enabled && (
                  <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: WARN }}>
                    Enable delivery before retrying.
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {notice && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, margin: 0 }}>{notice}</p>}
      {secretReveal && (
        <pre style={{ fontFamily: MONO, fontSize: "0.68rem", color: "#FDE68A", background: "rgba(0,0,0,0.35)", padding: "0.75rem", borderRadius: 8, overflowX: "auto" }}>
          {secretReveal}
        </pre>
      )}
      {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#FCA5A5", margin: 0 }}>{error}</p>}
      {loading && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>Loading…</p>}
      <AdminConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
