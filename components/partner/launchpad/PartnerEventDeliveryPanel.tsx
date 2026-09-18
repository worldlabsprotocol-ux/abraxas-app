"use client";
// FILE: components/partner/launchpad/PartnerEventDeliveryPanel.tsx
// Partner Launchpad self-service webhook setup. Secrets shown once. No raw payloads.

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface DeliveryRow {
  outbox_id: string;
  event_id: string;
  event_type: string;
  visible_state: string;
  occurred_at: string;
  attempt_count: number;
  last_error_code: string | null;
  redelivery_eligible: boolean;
}

interface WebhookOverview {
  endpoint_requirements: string[];
  disclaimer: string;
  webhook_configured: boolean;
  webhook_enabled: boolean;
  signing_secret_available: boolean;
  signing_secret_prefix: string | null;
  endpoint_display: string | null;
  delivery_not_guaranteed: boolean;
  latest_delivery_status: string | null;
  partner_action_channel: string;
  deliveries: DeliveryRow[];
}

export function PartnerEventDeliveryPanel({ applicationId }: { applicationId: string }) {
  const [overview, setOverview] = useState<WebhookOverview | null>(null);
  const [endpointUrl, setEndpointUrl] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/webhooks`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setOverview(data as WebhookOverview);
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  async function saveEndpoint() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/webhooks`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint_url: endpointUrl }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.error ?? "Could not save endpoint"));
      return;
    }
    setRevealedSecret(typeof data.signing_secret === "string" ? data.signing_secret : null);
    setNotice(String(data.notice ?? "Copy the signing secret now. It is shown once."));
    setEndpointUrl("");
    await load();
  }

  async function rotateSecret() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/webhooks/rotate`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.error ?? "Could not rotate secret"));
      return;
    }
    setRevealedSecret(typeof data.signing_secret === "string" ? data.signing_secret : null);
    setNotice(String(data.notice ?? "Copy the signing secret now. It is shown once."));
    await load();
  }

  async function setEnabled(enabled: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/webhooks`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.error ?? "Could not update delivery"));
      return;
    }
    await load();
  }

  async function removeEndpoint() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/webhooks`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.error ?? "Could not remove endpoint"));
      return;
    }
    setRevealedSecret(null);
    setNotice("Webhook endpoint removed. Delivery is disabled.");
    await load();
  }

  async function sendTest() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/webhooks/test`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.error ?? "Could not queue test event"));
      return;
    }
    setNotice(`TEST EVENT queued as ${data.event_id}. Best-effort delivery. Not authorization.`);
    await load();
  }

  async function redeliver(outboxId: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/webhooks/redeliver`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outbox_id: outboxId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.error ?? "Could not redeliver"));
      return;
    }
    setNotice(`Event ${data.event_id} requeued with the same event ID.`);
    await load();
  }

  const body: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    lineHeight: 1.65,
    margin: "0 0 0.75rem",
  };

  return (
    <ContentCard title="Partner Event Delivery">
      <p style={body}>
        Receive signed lifecycle events with no PII when a policy decision or receipt changes.
        A webhook event is never authorization. Fetch and verify the signed public receipt on your server before granting access.
      </p>
      <p style={body}>Delivery is best effort with bounded retries. It is not guaranteed.</p>
      {overview && (
        <>
          <p style={body}>
            Endpoint health: {overview.webhook_configured ? overview.endpoint_display : "not configured"}
            {" · "}
            Delivery {overview.webhook_enabled ? "enabled" : "disabled"}
            {" · "}
            Latest result: {overview.latest_delivery_status ?? "none"}
            {" · "}
            Action channel: {overview.partner_action_channel}
          </p>
          <ul style={{ ...body, paddingLeft: "1.1rem" }}>
            {overview.endpoint_requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <label style={{ display: "grid", gap: "0.35rem", fontFamily: FONT, fontSize: "0.72rem", marginBottom: "0.75rem" }}>
        HTTPS webhook URL
        <input
          value={endpointUrl}
          onChange={(event) => setEndpointUrl(event.target.value)}
          placeholder="https://partner.example/webhooks/abraxas"
          style={{ fontFamily: MONO, fontSize: "0.74rem", padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--border)" }}
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem" }}>
        <Btn size="sm" onClick={() => void saveEndpoint()} disabled={busy || !endpointUrl.trim()}>Save endpoint</Btn>
        <Btn size="sm" variant="secondary" onClick={() => void rotateSecret()} disabled={busy || !overview?.webhook_configured}>Rotate signing secret</Btn>
        <Btn size="sm" variant="secondary" onClick={() => void setEnabled(true)} disabled={busy || overview?.webhook_enabled}>Enable delivery</Btn>
        <Btn size="sm" variant="ghost" onClick={() => void setEnabled(false)} disabled={busy || !overview?.webhook_enabled}>Disable delivery</Btn>
        <Btn size="sm" variant="ghost" onClick={() => void removeEndpoint()} disabled={busy || !overview?.webhook_configured}>Remove endpoint</Btn>
        <Btn size="sm" variant="secondary" onClick={() => void sendTest()} disabled={busy || !overview?.webhook_enabled}>Send TEST EVENT</Btn>
      </div>
      {revealedSecret && (
        <div style={{ border: "1px solid #f59e0b", borderRadius: 10, padding: "0.75rem", marginBottom: "0.75rem" }}>
          <p style={{ ...body, margin: 0, color: "#92400e" }}>Copy this signing secret now. It will not be shown again.</p>
          <code style={{ fontFamily: MONO, fontSize: "0.72rem", display: "block", marginTop: "0.4rem", wordBreak: "break-all" }}>{revealedSecret}</code>
          <Btn size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(revealedSecret)}>Copy secret</Btn>
        </div>
      )}
      {overview?.signing_secret_prefix && !revealedSecret && (
        <p style={body}>Stored secret prefix: <code style={{ fontFamily: MONO }}>{overview.signing_secret_prefix}</code></p>
      )}
      {notice && <p style={{ ...body, color: "#065f46" }}>{notice}</p>}
      {error && <p style={{ ...body, color: "#b91c1c" }}>{error}</p>}
      {overview && overview.deliveries.length > 0 && (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {overview.deliveries.map((row) => (
            <div key={row.event_id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontFamily: FONT, fontSize: "0.74rem" }}>
                <span>{row.event_type}</span>
                <span>{row.visible_state}</span>
              </div>
              <p style={{ ...body, margin: "0.25rem 0 0" }}>
                {row.event_id} · attempts {row.attempt_count}
                {row.last_error_code ? ` · ${row.last_error_code}` : ""}
              </p>
              {row.redelivery_eligible && (
                <Btn size="sm" variant="secondary" onClick={() => void redeliver(row.outbox_id)} disabled={busy}>
                  Redeliver
                </Btn>
              )}
            </div>
          ))}
        </div>
      )}
    </ContentCard>
  );
}
