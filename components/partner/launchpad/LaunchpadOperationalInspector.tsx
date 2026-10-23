"use client";

import { useEffect, useState } from "react";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  useLaunchpadOperational,
  type LaunchpadActivitySelection,
} from "@/components/partner/launchpad/launchpadOperationalContext";
import { ModeCCommandRail, type ModeCCommandRailItem } from "@/components/product/ModeCCommandRail";
import { PartnerLifecycleControlRoomVisual } from "@/components/protocol-visuals";
import { LaunchpadActivityEvidenceTable } from "@/components/partner/launchpad/LaunchpadActivityEvidenceTable";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type ActivityEvent = {
  id?: string;
  event_type?: string;
  created_at?: string;
  public_code?: string | null;
  metadata?: Record<string, unknown>;
};

export function LaunchpadOperationalInspector({
  applicationId,
  activity,
  operationsItems = [],
  showOperationalLifecycle = false,
}: {
  applicationId: string | null;
  activity: ActivityEvent[];
  operationsItems?: ModeCCommandRailItem[];
  showOperationalLifecycle?: boolean;
}) {
  const { selectedActivity } = useLaunchpadOperational();
  const [webhook, setWebhook] = useState<{ available?: boolean; error?: string; deliveries?: Array<{ id: string; status: string }> } | null>(null);
  const [productionStatus, setProductionStatus] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<unknown>(null);
  const [timelineError, setTimelineError] = useState("");
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

  useEffect(() => {
    if (!applicationId || !selectedActivity) {
      setTimeline(null);
      setTimelineError("");
      return;
    }
    const requestId = typeof selectedActivity.metadata?.request_id === "string"
      ? selectedActivity.metadata.request_id
      : undefined;
    const receiptId = typeof selectedActivity.metadata?.receipt_id === "string"
      ? selectedActivity.metadata.receipt_id
      : undefined;
    let cancelled = false;
    void (async () => {
      setTimelineError("");
      try {
        const params = new URLSearchParams();
        if (requestId) params.set("request_id", requestId);
        if (receiptId) params.set("receipt_id", receiptId);
        const res = await fetch(
          `/api/launchpad/applications/${applicationId}/integration-timeline?${params.toString()}`,
          { credentials: "include", cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setTimeline(null);
          setTimelineError(typeof data.error === "string" ? data.error : "Timeline unavailable for this event");
          return;
        }
        setTimeline(data);
      } catch {
        if (!cancelled) {
          setTimeline(null);
          setTimelineError("Timeline fetch failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, selectedActivity]);

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
    <details className="abx-launchpad-inspector abx-launchpad-inspector--collapsible" open={false}>
      <summary
        className="abx-studio-inspector__header"
        style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 0.65rem", cursor: "pointer", listStyle: "none" }}
      >
        Evidence & diagnostics
      </summary>
      {loading && <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>Refreshing…</p>}

      {operationsItems.length > 0 && (
        <section style={{ marginBottom: "0.85rem" }}>
          <ModeCCommandRail items={operationsItems} />
        </section>
      )}

      {showOperationalLifecycle && (
        <details className="abx-launchpad-inspector__lifecycle" open={false}>
          <summary style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", marginBottom: "0.5rem" }}>
            Partner operations milestones
          </summary>
          <div className="abx-surface-protocol-visual abx-surface-protocol-visual--compact">
            <PartnerLifecycleControlRoomVisual />
          </div>
        </details>
      )}

      {activity.length > 0 && (
        <section style={{ marginBottom: "0.85rem" }}>
          <h3 style={{ fontFamily: FONT, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>
            Integration activity
          </h3>
          <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0 0 0.45rem" }}>
            Select a row to inspect evidence below.
          </p>
          <LaunchpadActivityEvidenceTable
            events={activity.filter((row): row is LaunchpadActivitySelection => Boolean(row.id))}
          />
        </section>
      )}

      <section style={{ marginBottom: "0.85rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>
          Selected activity
        </h3>
        {selectedActivity ? (
          <>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", margin: "0 0 0.35rem" }}>
              {selectedActivity.event_type.replace(/_/g, " ")}
              {selectedActivity.public_code ? ` · ${selectedActivity.public_code}` : ""}
            </p>
            {timelineError && (
              <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)" }}>{timelineError}</p>
            )}
            {timeline ? (
              <pre
                className="abx-code-scroll"
                style={{
                  fontFamily: MONO,
                  fontSize: "0.58rem",
                  maxHeight: 200,
                  overflow: "auto",
                  margin: 0,
                  padding: "0.45rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-inset)",
                }}
              >
                {JSON.stringify(timeline, null, 2)}
              </pre>
            ) : !timelineError ? (
              <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)" }}>
                Select a row with linked request/receipt metadata for a full timeline.
              </p>
            ) : null}
            {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: "0.58rem",
                  maxHeight: 120,
                  overflow: "auto",
                  margin: "0.35rem 0 0",
                }}
              >
                {JSON.stringify(selectedActivity.metadata, null, 2)}
              </pre>
            )}
          </>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
            Select an activity row to inspect evidence.
          </p>
        )}
      </section>

      <section style={{ marginBottom: "0.85rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>
          Production review
        </h3>
        <p style={{ fontFamily: MONO, fontSize: "0.62rem", margin: 0 }}>{productionStatus ?? "N/A"}</p>
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
          Activity count
        </h3>
        <p style={{ fontFamily: MONO, fontSize: "0.62rem", margin: 0 }}>{activity.length} events loaded</p>
      </section>
    </details>
  );
}
