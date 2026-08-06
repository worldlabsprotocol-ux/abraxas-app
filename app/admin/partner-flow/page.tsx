"use client";
// FILE: app/admin/partner-flow/page.tsx
// Read-only Partner Flow operational health (last 24h).

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

type HealthReport = {
  window_hours: number;
  generated_at: string;
  sources: { in_memory_telemetry: boolean; partner_api_usage: boolean };
  rate_limit: {
    enabled: boolean;
    backend: string;
    distributedStoreRequired: boolean;
    distributedStoreConfigured: boolean;
    note: string;
  };
  telemetry: {
    total_requests: number;
    rate_limited_total: number;
    error_total: number;
    audit_persistence_failures: number;
    by_endpoint: Array<{
      endpoint: string;
      method: string;
      total: number;
      success: number;
      rate_limited: number;
      error_rate: number;
      rate_limit_rate: number;
      avg_latency_ms: number;
      p95_latency_ms: number;
    }>;
  };
};

export default function AdminPartnerFlowHealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/partner-flow/health", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load health report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Admin · Partner Flow
            </div>
            <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              Operational Health (24h)
            </h1>
          </div>
          <Link href="/admin/partners" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            ← Partners
          </Link>
        </div>

        {loading && <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: FONT }}>Loading…</p>}
        {error && <p style={{ color: "#f87171", fontFamily: FONT }}>{error}</p>}

        {report && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {[
                ["Total requests", report.telemetry.total_requests],
                ["429 rate limits", report.telemetry.rate_limited_total],
                ["Errors (4xx/5xx)", report.telemetry.error_total],
                ["Audit persist fails", report.telemetry.audit_persistence_failures],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "0.875rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontFamily: MONO, fontSize: "1.1rem", fontWeight: 800, color: ACCENT }}>{value}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: "1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", marginBottom: "1.25rem", fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              <strong style={{ color: "#f0f0f0" }}>Rate limit backend:</strong>{" "}
              {report.rate_limit.enabled ? report.rate_limit.backend : "disabled"}
              {report.rate_limit.distributedStoreRequired && !report.rate_limit.distributedStoreConfigured && (
                <span style={{ display: "block", marginTop: 6, color: "#fbbf24" }}>{report.rate_limit.note}</span>
              )}
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: "0.5rem", padding: "0.6rem 0.9rem", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                {["Endpoint", "Total", "429", "Err%", "Avg ms", "P95 ms"].map(h => <div key={h}>{h}</div>)}
              </div>
              {report.telemetry.by_endpoint.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "rgba(255,255,255,0.35)", fontFamily: FONT, fontSize: "0.8rem" }}>
                  No Partner Flow traffic recorded in the last {report.window_hours}h.
                </div>
              ) : report.telemetry.by_endpoint.map(row => (
                <div key={`${row.method}:${row.endpoint}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: "0.5rem", padding: "0.65rem 0.9rem", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: MONO, fontSize: "0.62rem" }}>
                  <div style={{ color: "#f0f0f0", wordBreak: "break-all" }}>{row.method} {row.endpoint}</div>
                  <div>{row.total}</div>
                  <div style={{ color: row.rate_limited > 0 ? "#fbbf24" : "inherit" }}>{row.rate_limited}</div>
                  <div>{(row.error_rate * 100).toFixed(1)}%</div>
                  <div>{row.avg_latency_ms}</div>
                  <div>{row.p95_latency_ms}</div>
                </div>
              ))}
            </div>

            <p style={{ marginTop: "1rem", fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
              Generated {new Date(report.generated_at).toLocaleString()} · Sources:{" "}
              {report.sources.partner_api_usage ? "partner_api_usage" : "in-memory telemetry only"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
