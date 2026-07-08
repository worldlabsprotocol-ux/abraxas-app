"use client";
// FILE: app/developers/partner/page.tsx
// Partner dashboard — paste API key to view usage, success rate, and recent decisions.

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface DashboardPayload {
  partner_id: string;
  display_name: string;
  company: string | null;
  status: string | null;
  key_prefix: string;
  scopes: string[];
  stats: {
    calls_30d: number;
    success_30d: number;
    success_rate: number | null;
    calls_7d: number;
  };
  recent_events: Array<{
    id: string;
    endpoint: string;
    method: string;
    success: boolean | null;
    decision: string | null;
    record_id: string | null;
    policy_id: string | null;
    http_status: number | null;
    response_time_ms: number | null;
    created_at: string;
  }>;
}

export default function PartnerDashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard() {
    if (!apiKey.trim()) {
      setError("Paste your abx_live_ or abx_test_ API key.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partner/dashboard", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      const data = await res.json() as { ok?: boolean; dashboard?: DashboardPayload; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load dashboard");
      setDashboard(data.dashboard ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Developers"
        title="Partner dashboard"
        subtitle="Authenticate with your API key to view verification usage, success rate, and recent decision logs. Keys are issued at /admin/partners during the pilot."
      />

      <ContentCard title="Connect your key">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
          Send <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>Authorization: Bearer abx_live_…</code> on{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>POST /api/credentials/verify</code>.
          Revoked keys fail immediately.
        </p>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="abx_live_…"
            style={{
              flex: "1 1 240px",
              padding: "0.6rem 0.75rem",
              borderRadius: 10,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-inset)",
              color: "var(--text-primary)",
              fontFamily: MONO,
              fontSize: "0.72rem",
            }}
          />
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: 10,
              border: "none",
              background: ACCENT,
              color: "#04130C",
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? "Loading…" : "Load dashboard"}
          </button>
        </div>
        {error && (
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#EF4444", margin: "0.65rem 0 0" }}>{error}</p>
        )}
      </ContentCard>

      {dashboard && (
        <>
          <ContentCard title={`${dashboard.display_name} · ${dashboard.partner_id}`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
              {[
                ["API calls (30d)", String(dashboard.stats.calls_30d)],
                ["Success rate", dashboard.stats.success_rate != null ? `${dashboard.stats.success_rate}%` : "—"],
                ["Successful (30d)", String(dashboard.stats.success_30d)],
                ["Calls (7d)", String(dashboard.stats.calls_7d)],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "0.85rem", borderRadius: 12, background: "var(--surface-inset)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: FONT, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.85rem 0 0", lineHeight: 1.6 }}>
              {dashboard.company ? `${dashboard.company} · ` : ""}
              Key prefix {dashboard.key_prefix}… · Scopes: {dashboard.scopes.join(", ")}
              {dashboard.status ? ` · Status: ${dashboard.status}` : ""}
            </p>
          </ContentCard>

          <ContentCard title="Recent verification events">
            {dashboard.recent_events.length === 0 ? (
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                No logged events yet. Make a test call from Postman or the script below.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "0.4rem" }}>
                {dashboard.recent_events.map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "0.5rem",
                      padding: "0.5rem 0.65rem",
                      borderRadius: 8,
                      background: "var(--surface-inset)",
                      border: "1px solid var(--border)",
                      fontFamily: FONT,
                      fontSize: "0.72rem",
                    }}
                  >
                    <div>
                      <code style={{ fontFamily: MONO, fontSize: "0.65rem", color: ACCENT }}>{ev.method} {ev.endpoint}</code>
                      <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                        {ev.decision ?? "—"}
                        {ev.record_id ? ` · ${ev.record_id}` : ""}
                        {ev.policy_id ? ` · ${ev.policy_id}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", color: "var(--text-muted)", fontFamily: MONO, fontSize: "0.62rem" }}>
                      {ev.http_status ?? "—"}
                      {ev.response_time_ms != null ? ` · ${ev.response_time_ms}ms` : ""}
                      <br />
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>
        </>
      )}

      <ContentCard title="Quick test (Postman or curl)">
        <pre style={{
          fontFamily: MONO,
          fontSize: "0.68rem",
          color: "var(--text-secondary)",
          overflow: "auto",
          margin: 0,
          padding: "0.85rem",
          borderRadius: 10,
          background: "var(--surface-inset)",
          border: "1px solid var(--border)",
          lineHeight: 1.55,
        }}>
{`curl -X POST https://abraxas-app.vercel.app/api/credentials/verify \\
  -H "Authorization: Bearer YOUR_abx_live_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"record_id":"ABX-RE-HOSP-001","policy_id":"abraxas-booking-v1","requested_action":"book_asset"}'`}
        </pre>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Link href="/integrations/relying-parties" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
          Integration guide →
        </Link>
        <Link href="/verify/ABX-RE-HOSP-001" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
          Sample record →
        </Link>
        <Link href="/metrics" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
          Network metrics →
        </Link>
      </div>
    </RedesignPage>
  );
}
