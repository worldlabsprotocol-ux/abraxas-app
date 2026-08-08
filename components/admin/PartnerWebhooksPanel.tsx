"use client";
// FILE: components/admin/PartnerWebhooksPanel.tsx
// Admin partner webhook configuration and delivery health.

import { useCallback, useEffect, useState } from "react";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

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

export function PartnerWebhooksPanel({ adminPin }: { adminPin: string }) {
  const [partnerId, setPartnerId] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [configs, setConfigs] = useState<WebhookConfig[]>([]);
  const [health, setHealth] = useState<HealthCounts | null>(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [secretReveal, setSecretReveal] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const headers: Record<string, string> = {};
  if (adminPin) headers["x-admin-pin"] = adminPin;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [configRes, healthRes] = await Promise.all([
        fetch("/api/admin/partners/webhooks", { headers }),
        fetch("/api/admin/partners/webhooks/delivery-health", { headers }),
      ]);
      const configBody = await configRes.json() as { configs?: WebhookConfig[]; disclaimer?: string; error?: string };
      const healthBody = await healthRes.json() as { counts?: HealthCounts; error?: string };
      if (!configRes.ok) throw new Error(configBody.error ?? "Failed to load configs");
      setConfigs(configBody.configs ?? []);
      setDisclaimer(configBody.disclaimer ?? "");
      setHealth(healthBody.counts ?? null);
      const existing = configBody.configs?.find(c => c.partner_id === partnerId.trim());
      if (existing) setEndpointUrl(existing.endpoint_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [adminPin, partnerId]);

  useEffect(() => { void load(); }, [load]);

  async function saveEndpoint() {
    setLoading(true);
    setError("");
    setNotice("");
    setSecretReveal("");
    try {
      const res = await fetch("/api/admin/partners/webhooks", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId.trim(), endpoint_url: endpointUrl.trim() }),
      });
      const body = await res.json() as { signing_secret?: string; notice?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Save failed");
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
      const res = await fetch("/api/admin/partners/webhooks", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId.trim(), enabled }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function rotateSecret() {
    setLoading(true);
    setError("");
    setSecretReveal("");
    try {
      const res = await fetch("/api/admin/partners/webhooks/rotate-secret", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
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

  const selected = configs.find(c => c.partner_id === partnerId.trim());

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
        {disclaimer || "Webhook notifications are not proof of access. Partners must re-fetch public receipts and validate currently_valid."}
      </p>

      {health && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {Object.entries(health).map(([status, count]) => (
            <span key={status} style={{
              fontFamily: MONO, fontSize: "0.62rem", padding: "0.3rem 0.55rem", borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)",
            }}>
              {status}: {count}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: "0.65rem", maxWidth: 640 }}>
        <input value={partnerId} onChange={e => setPartnerId(e.target.value)} placeholder="partner_id"
          style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem" }} />
        <input value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder="https://partner.example/webhooks/abraxas"
          style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem" }} />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" disabled={loading || !partnerId.trim() || !endpointUrl.trim()} onClick={() => void saveEndpoint()}
            style={{ padding: "0.45rem 0.85rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontWeight: 700, cursor: "pointer" }}>
            Save HTTPS endpoint
          </button>
          {selected && (
            <button type="button" disabled={loading} onClick={() => void toggleEnabled(!selected.enabled)}
              style={{ padding: "0.45rem 0.85rem", borderRadius: 8, border: `1px solid ${ACCENT}55`, background: "transparent", color: ACCENT, cursor: "pointer" }}>
              {selected.enabled ? "Disable delivery" : "Enable delivery"}
            </button>
          )}
          {selected && (
            <button type="button" disabled={loading} onClick={() => void rotateSecret()}
              style={{ padding: "0.45rem 0.85rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f0f0f0", cursor: "pointer" }}>
              Rotate signing secret
            </button>
          )}
        </div>
      </div>

      {selected && (
        <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
          Secret prefix {selected.signing_secret_prefix} · {selected.enabled ? "enabled" : "disabled (default)"}
        </p>
      )}

      {notice && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, margin: 0 }}>{notice}</p>}
      {secretReveal && (
        <pre style={{ fontFamily: MONO, fontSize: "0.68rem", color: "#FDE68A", background: "rgba(0,0,0,0.35)", padding: "0.75rem", borderRadius: 8, overflowX: "auto" }}>
          {secretReveal}
        </pre>
      )}
      {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#FCA5A5", margin: 0 }}>{error}</p>}
      {loading && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>Loading…</p>}
    </div>
  );
}
