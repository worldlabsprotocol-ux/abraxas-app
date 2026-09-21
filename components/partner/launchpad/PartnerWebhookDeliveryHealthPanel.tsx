"use client";
// FILE: components/partner/launchpad/PartnerWebhookDeliveryHealthPanel.tsx
// Read-only webhook delivery health. No live send.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { WebhookDeliveryHealthView } from "@/lib/partner/launchpad/webhookDeliveryHealth";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
  overflowWrap: "anywhere",
};

export function PartnerWebhookDeliveryHealthPanel({ applicationId }: { applicationId: string }) {
  const [view, setView] = useState<WebhookDeliveryHealthView | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await fetch(
        `/api/launchpad/applications/${applicationId}/webhook-delivery-health`,
        { credentials: "include" },
      );
      const data = await res.json() as WebhookDeliveryHealthView & { error?: string };
      if (!res.ok) {
        setView(null);
        setError("Unable to load webhook delivery health.");
        return;
      }
      setView(data);
    } catch {
      setError("Unable to load webhook delivery health.");
      setView(null);
    }
  }

  useEffect(() => {
    void load();
  }, [applicationId]);

  return (
    <ContentCard title={view?.scope_label ?? "Webhook delivery"}>
      <p style={body}>
        {view?.scope_explanation
          ?? "Webhook configuration is stored per partner. Delivery rows are shown only when they can be attributed safely."}
        {" "}
        A webhook is a notification only. Re-fetch and server-verify the current receipt before granting access.
      </p>
      {error && <p role="alert" aria-live="assertive" style={body}>{error}</p>}
      {view && (
        <>
          <p style={body}>
            {view.webhook_configured ? "Webhook configured" : "Webhook not configured"}
            {" · "}
            Host: {view.host_class}{view.masked_host ? ` (${view.masked_host})` : ""}
            {" · "}
            Signing secret: {view.signing_secret_configured ? "configured" : "not configured"}
            {" · "}
            Delivery: {view.delivery_enabled ? "enabled" : "disabled"}
          </p>
          <p style={body}>Events: {view.event_types.join(", ")}</p>
          <p style={body}>
            Last {view.window_hours}h — delivered {view.counts.delivered}, failed {view.counts.failed},
            pending {view.counts.pending}, disabled {view.counts.disabled}.
            {view.last_delivery_at ? ` Last delivery ${new Date(view.last_delivery_at).toLocaleString()}.` : " No deliveries in this window."}
            {view.last_failure_class ? ` Last failure class: ${view.last_failure_class.replace(/_/g, " ")}.` : ""}
          </p>
          <p style={body}>
            Retry: {view.retry.state} ({view.retry.max_attempts} bounded attempts).
            Delivery status does not grant eligibility or Production access.
          </p>
          {view.capability_state === "optional_not_selected" && view.delivery_scope === "app_policy" && (
            <p style={body}>
              Webhooks are optional. Add the capability through Integration Studio if this partner path needs them.
            </p>
          )}
          {view.capability_state === "optional_not_selected" && view.delivery_scope === "partner_wide" && (
            <p style={body}>
              Webhooks are optional. Add the capability through Integration Studio. Partner-wide delivery rows below are not this app’s readiness.
            </p>
          )}
          <p style={body}>{view.notice}</p>
          <ul style={{ ...body, paddingLeft: "1.1rem" }}>
            {view.checklist.map((item) => (
              <li key={item.id}><strong>{item.title}.</strong> {item.detail}</li>
            ))}
          </ul>
          {view.next_actions.length > 0 && (
            <ul style={{ ...body, paddingLeft: "1.1rem" }}>
              {view.next_actions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          <p style={body}>
            <Link href={view.links.test_console}>Sandbox HMAC fixture</Link>
            {" · "}
            <Link href={view.links.starter_kit}>Starter Kit</Link>
            {" · "}
            <Link href={view.links.event_delivery_docs}>Webhook documentation</Link>
            {" · "}
            <Link href={view.links.lifecycle_docs}>Receipt lifecycle events</Link>
            {" · "}
            <Link href={view.links.integration_studio}>Integration Studio</Link>
          </p>
          {view.deliveries.length > 0 && (
            <div style={{ overflowX: "auto", maxWidth: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
                <caption style={{ textAlign: "left", marginBottom: "0.4rem", fontWeight: 700 }}>
                  {view.delivery_scope === "app_policy" ? "Recent deliveries for this app’s policy" : "Recent partner-wide deliveries"}
                </caption>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Reference</th>
                    <th style={{ textAlign: "left" }}>Event</th>
                    <th style={{ textAlign: "left" }}>Status</th>
                    <th style={{ textAlign: "left" }}>When</th>
                    <th style={{ textAlign: "left" }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {view.deliveries.map((row) => (
                    <tr key={row.delivery_ref}>
                      <td>{row.delivery_ref}</td>
                      <td>{row.event_type}</td>
                      <td>{row.status}</td>
                      <td>{new Date(row.occurred_at).toLocaleString()}</td>
                      <td>{row.failure_class ? row.failure_class.replace(/_/g, " ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3 id="receipt-lifecycle-events-heading" style={{ fontFamily: FONT, fontSize: "0.86rem", fontWeight: 800, margin: "1rem 0 0.4rem" }}>
            Receipt lifecycle events
          </h3>
          <p style={body}>{view.scheduling_notice}</p>
          <ul style={{ ...body, paddingLeft: "1.1rem" }}>
            {view.lifecycle_checklist.map((item) => (
              <li key={item.id}><strong>{item.title}.</strong> {item.detail}</li>
            ))}
          </ul>
          <pre
            aria-label="Safe lifecycle fixture payloads"
            className="abx-code-scroll"
            style={{ fontFamily: FONT, fontSize: "0.68rem", whiteSpace: "pre-wrap", margin: "0 0 0.75rem" }}
          >
            {JSON.stringify(view.lifecycle_fixtures, null, 2)}
          </pre>
        </>
      )}
      <Btn size="sm" variant="secondary" onClick={() => void load()}>Refresh delivery health</Btn>
    </ContentCard>
  );
}
