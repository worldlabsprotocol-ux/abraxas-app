"use client";
// FILE: components/admin/PartnerFlowHealthPanel.tsx
// Operator-friendly Partner Flow health dashboard (read-only).

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PartnerFlowHealthReport } from "@/lib/partner/partnerFlowHealth";
import {
  buildActivityEmptyMessage,
  buildEndpointActivityRows,
  buildMetricCards,
  buildNextActionView,
  buildProtectionStatus,
  buildTechnicalDetails,
  hasPartnerFlowActivity,
} from "@/lib/partner/partnerFlowHealthViewModel";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";
const WARN = "#fbbf24";
const CRITICAL = "#f87171";

export function PartnerFlowHealthPanel({ report }: { report: PartnerFlowHealthReport }) {
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const metricCards = useMemo(() => buildMetricCards(report.telemetry), [report.telemetry]);
  const protection = useMemo(() => buildProtectionStatus(report.rate_limit), [report.rate_limit]);
  const nextAction = useMemo(() => buildNextActionView(report.rate_limit), [report.rate_limit]);
  const technical = useMemo(() => buildTechnicalDetails(report), [report]);
  const activityRows = useMemo(() => buildEndpointActivityRows(report), [report]);
  const hasActivity = hasPartnerFlowActivity(report);

  function openTechnicalDetails() {
    setTechnicalOpen(true);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("partner-flow-technical-details")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  return (
    <>
      <section
        aria-label="Protection status"
        style={{
          padding: "1rem 1.1rem",
          borderRadius: 10,
          border: `1px solid ${protection.isCritical ? "rgba(248,113,113,0.35)" : "rgba(16,185,129,0.25)"}`,
          background: protection.isCritical ? "rgba(248,113,113,0.06)" : "rgba(16,185,129,0.06)",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: "#f0f0f0" }}>
          {protection.headline}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
          {protection.subheadline}
        </p>
        {protection.isCritical && protection.criticalMessage && (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: CRITICAL, margin: "0.65rem 0 0", lineHeight: 1.5 }}>
            {protection.criticalMessage}
          </p>
        )}
      </section>

      {protection.showYellowBanner && (
        <section
          aria-label="Network-wide protection status"
          style={{
            padding: "0.95rem 1.1rem",
            borderRadius: 10,
            border: "1px solid rgba(251,191,36,0.35)",
            background: "rgba(251,191,36,0.08)",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: WARN }}>
            {protection.yellowBannerTitle}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", margin: "0.4rem 0 0", lineHeight: 1.55 }}>
            {protection.yellowBannerBody}
          </p>
        </section>
      )}

      {nextAction.show && (
        <section
          aria-label="Recommended next action"
          style={{
            padding: "1rem 1.1rem",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "#f0f0f0", marginBottom: 6 }}>
            {nextAction.title}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
            {nextAction.body}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            <a
              href={nextAction.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: FONT,
                fontSize: "0.76rem",
                fontWeight: 600,
                color: "#0a0c10",
                background: ACCENT,
                padding: "0.45rem 0.75rem",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              {nextAction.docLinkLabel}
            </a>
            <button
              type="button"
              onClick={openTechnicalDetails}
              style={{
                fontFamily: FONT,
                fontSize: "0.76rem",
                fontWeight: 600,
                color: ACCENT,
                background: "transparent",
                border: `1px solid ${ACCENT}`,
                padding: "0.45rem 0.75rem",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              View technical details
            </button>
          </div>
        </section>
      )}

      <section aria-label="24 hour activity summary" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", margin: "0 0 0.75rem" }}>
          Last 24 hours
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
          {metricCards.map(card => (
            <div
              key={card.label}
              style={{
                padding: "0.875rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: "1.1rem", fontWeight: 800, color: ACCENT }}>
                {card.value}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 600, color: "#f0f0f0", marginTop: 4 }}>
                {card.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", marginTop: 6, lineHeight: 1.45 }}>
                {card.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Activity by surface" style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden", marginBottom: "1.25rem" }}>
        <div style={{ padding: "0.75rem 0.9rem", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
          Activity by surface
        </div>
        {!hasActivity ? (
          <div style={{ padding: "1.75rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.5)", fontFamily: FONT, fontSize: "0.84rem" }}>
            {buildActivityEmptyMessage(report.window_hours)}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 0.7fr 0.9fr 0.7fr 0.8fr 0.8fr",
                gap: "0.5rem",
                padding: "0.6rem 0.9rem",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontFamily: FONT,
                fontSize: "0.68rem",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {["Surface", "Total", "Slowed", "Errors", "Avg speed", "Peak speed"].map(h => (
                <div key={h}>{h}</div>
              ))}
            </div>
            {activityRows.map(row => (
              <div
                key={`${row.method}:${row.rawEndpoint}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 0.7fr 0.9fr 0.7fr 0.8fr 0.8fr",
                  gap: "0.5rem",
                  padding: "0.65rem 0.9rem",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  fontFamily: FONT,
                  fontSize: "0.76rem",
                }}
              >
                <div>
                  <div style={{ color: "#f0f0f0", fontWeight: 600 }}>{row.friendlyName}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", marginTop: 2 }}>{row.method}</div>
                </div>
                <div>{row.total}</div>
                <div style={{ color: row.rateLimited > 0 ? WARN : "inherit" }}>{row.rateLimited}</div>
                <div>{row.errorRatePercent}</div>
                <div>{row.avgLatencyMs} ms</div>
                <div>{row.p95LatencyMs} ms</div>
              </div>
            ))}
          </>
        )}
      </section>

      <section id="partner-flow-technical-details" aria-label="Technical details" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => setTechnicalOpen(open => !open)}
          aria-expanded={technicalOpen}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 0.9rem",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.02)",
            color: "rgba(255,255,255,0.75)",
            fontFamily: FONT,
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span>Technical details</span>
          <span aria-hidden="true">{technicalOpen ? "−" : "+"}</span>
        </button>

        {technicalOpen && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.9rem 1rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.2)",
              fontFamily: FONT,
              fontSize: "0.74rem",
              color: "rgba(255,255,255,0.62)",
              lineHeight: 1.55,
            }}
          >
            <p style={{ margin: "0 0 0.75rem" }}>
              <strong style={{ color: "#f0f0f0" }}>Rate limit backend:</strong> {technical.rateLimitBackend}
              <br />
              <strong style={{ color: "#f0f0f0" }}>HMAC secret configured:</strong> {technical.hmacSecretConfigured ? "yes" : "no"}
              <br />
              <strong style={{ color: "#f0f0f0" }}>IP strategy:</strong> {technical.trustedIpStrategy}
              <br />
              <strong style={{ color: "#f0f0f0" }}>Redis credentials present:</strong> {technical.distributedStoreConfigured ? "yes" : "no"}
              <br />
              <strong style={{ color: "#f0f0f0" }}>Network-wide protection active:</strong> {technical.distributedStoreActive ? "yes" : "no"}
              <br />
              {technical.distributedStoreConfigured && (
                <>
                  <strong style={{ color: "#f0f0f0" }}>Redis reachable:</strong>{" "}
                  {technical.distributedStoreReachable === null
                    ? "unknown"
                    : technical.distributedStoreReachable ? "yes" : `no (${technical.distributedStoreErrorCode ?? "unknown"})`}
                  <br />
                </>
              )}
              <strong style={{ color: "#f0f0f0" }}>Data sources:</strong> {technical.dataSources}
            </p>
            <p style={{ margin: "0 0 0.75rem" }}>{technical.operatorNote}</p>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Environment variables</p>
            <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
              {technical.envVarNames.map(name => (
                <li key={name}><code style={{ fontFamily: MONO, fontSize: "0.7rem" }}>{name}</code></li>
              ))}
            </ul>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>CLI (operators with repo access)</p>
            <code style={{ fontFamily: MONO, fontSize: "0.68rem", display: "block", marginBottom: "0.75rem" }}>
              {technical.cliCommand}
            </code>
            {technical.rawEndpoints.length > 0 && (
              <>
                <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Raw endpoints</p>
                <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                  {technical.rawEndpoints.map(row => (
                    <li key={`${row.method}:${row.rawEndpoint}`}>
                      <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>{row.method} {row.rawEndpoint}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p style={{ margin: "0.75rem 0 0" }}>
              <Link href={nextAction.docUrl} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: "none" }}>
                Partner Flow rate limit setup guide →
              </Link>
            </p>
          </div>
        )}
      </section>

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
        Updated {new Date(report.generated_at).toLocaleString()}
      </p>
    </>
  );
}
