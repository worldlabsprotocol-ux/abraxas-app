"use client";

import { useEffect, useState } from "react";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type ActivityEvent = {
  id?: string;
  event_type?: string;
  created_at?: string;
  public_code?: string | null;
};

export function LaunchpadOperationalInspector({
  applicationId,
  activity,
}: {
  applicationId: string | null;
  activity: ActivityEvent[];
}) {
  const [webhook, setWebhook] = useState<{ available?: boolean; error?: string; deliveries?: Array<{ id: string; status: string }> } | null>(null);
  const [productionStatus, setProductionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!applicationId) {
      setWebhook(null);
      setProductionStatus(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [whRes, prodRes] = await Promise.all([
          fetch(`/api/launchpad/applications/${applicationId}/webhook-delivery-health`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/launchpad/applications/${applicationId}/production-access`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        const whData = await whRes.json();
        const prodData = await prodRes.json();
        if (cancelled) return;
        setWebhook(whRes.ok ? whData : { available: false, error: whData.error });
        setProductionStatus(
          prodRes.ok
            ? (prodData.status as string | undefined) ?? prodData.request?.status ?? "unknown"
            : "unavailable",
        );
      } catch {
        if (!cancelled) {
          setWebhook({ available: false, error: "fetch_failed" });
          setProductionStatus("unavailable");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (!applicationId) {
    return (
      <aside className="abx-launchpad-inspector" aria-label="Launchpad diagnostics">
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Select or create an application to load webhook, activity, and production review diagnostics.
        </p>
      </aside>
    );
  }

  return (
    <aside className="abx-launchpad-inspector" aria-label="Launchpad diagnostics">
      <h2 style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 0.65rem" }}>Evidence & diagnostics</h2>
      {loading && <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>Refreshing…</p>}
      <section style={{ marginBottom: "0.85rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>
          Production review
        </h3>
        <p style={{ fontFamily: MONO, fontSize: "0.62rem", margin: 0 }}>{productionStatus ?? "—"}</p>
      </section>
      <section style={{ marginBottom: "0.85rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>
          Webhook delivery
        </h3>
        {webhook?.available === false && (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
            Telemetry unavailable{webhook.error ? `: ${webhook.error}` : ""}.
          </p>
        )}
        {webhook?.deliveries?.length ? (
          <ul style={{ fontFamily: FONT, fontSize: "0.65rem", paddingLeft: "1rem", margin: 0 }}>
            {webhook.deliveries.slice(0, 6).map((row) => (
              <li key={row.id}>{row.status.replace(/_/g, " ")}</li>
            ))}
          </ul>
        ) : webhook && webhook.available !== false ? (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>No deliveries in window.</p>
        ) : null}
      </section>
      <section>
        <h3 style={{ fontFamily: FONT, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>
          Recent activity
        </h3>
        {activity.length ? (
          <ul style={{ fontFamily: FONT, fontSize: "0.65rem", paddingLeft: "1rem", margin: 0, display: "grid", gap: "0.2rem" }}>
            {activity.slice(0, 8).map((event, index) => (
              <li key={event.id ?? `${event.event_type}-${index}`}>
                {(event.event_type ?? "event").replace(/_/g, " ")}
                {event.public_code ? ` · ${event.public_code}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>No activity recorded yet.</p>
        )}
      </section>
    </aside>
  );
}
