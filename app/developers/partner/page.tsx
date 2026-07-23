"use client";
// FILE: app/developers/partner/page.tsx
// Partner self-service portal. authenticate with issued abx_ API key.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const KEY_STORAGE = "abraxas_partner_api_key";

interface Dashboard {
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
    endpoint: string;
    decision: string | null;
    created_at: string;
  }>;
  onboarding: {
    steps: Array<{ id: string; title: string; description: string; done: boolean }>;
    completed: number;
    total: number;
    productionGateEligible: boolean;
  };
  mainnet_gate: { eligible: boolean; criteria: string };
}

export default function PartnerPortalPage() {
  const [apiKey, setApiKey] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORAGE);
      if (saved) {
        setApiKey(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!apiKey.startsWith("abx_")) return;
    void loadDashboard(apiKey);
  }, [apiKey]);

  async function loadDashboard(key: string) {
    setError("");
    const res = await fetch("/api/partner/dashboard", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setDashboard(null);
      setError(data.error ?? "Invalid API key");
      return;
    }
    setDashboard(data.dashboard);
    try {
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      /* ignore */
    }
  }

  function logout() {
    setApiKey("");
    setDashboard(null);
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
  }

  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="Developers"
        title="Partner portal"
        subtitle="View API usage, onboarding progress, and mainnet gate eligibility. Keys are server-side only. never expose in client apps."
      />

      {!dashboard ? (
        <ContentCard title="Authenticate with your API key">
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
            Use the <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>abx_test_</code> or{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>abx_live_</code> key issued after application approval.
            No key yet? <Link href="/design-partner" style={{ color: "var(--accent)", fontWeight: 700 }}>Apply →</Link>
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="abx_test_… or abx_live_…"
              style={inputStyle}
            />
            <button type="button" onClick={() => void loadDashboard(apiKey)} style={btnStyle}>
              View dashboard
            </button>
          </div>
          {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#ef4444", marginTop: "0.5rem" }}>{error}</p>}
        </ContentCard>
      ) : (
        <>
          <ContentCard title={`${dashboard.company ?? dashboard.partner_id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {dashboard.key_prefix}… · {dashboard.status ?? "unknown"} · scopes: {dashboard.scopes.join(", ")}
              </div>
              <button type="button" onClick={logout} style={{ ...btnStyle, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "0.35rem 0.65rem", fontSize: "0.68rem" }}>
                Sign out
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem", marginTop: "0.75rem" }}>
              {[
                { label: "30d calls", value: dashboard.stats.calls_30d },
                { label: "7d calls", value: dashboard.stats.calls_7d },
                { label: "Success rate", value: dashboard.stats.success_rate != null ? `${dashboard.stats.success_rate}%` : ", " },
              ].map(stat => (
                <div key={stat.label} style={{ padding: "0.65rem", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)" }}>{stat.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Onboarding progress">
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.65rem" }}>
              {dashboard.onboarding.completed}/{dashboard.onboarding.total} steps complete
            </p>
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {dashboard.onboarding.steps.map(step => (
                <div key={step.id} style={{
                  padding: "0.6rem 0.75rem", borderRadius: 10,
                  border: `1px solid ${step.done ? "rgba(232,197,71,0.35)" : "var(--border)"}`,
                  background: step.done ? "rgba(232,197,71,0.06)" : "transparent",
                }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, color: step.done ? "var(--accent)" : "var(--text-primary)" }}>
                    {step.done ? "✓" : "○"} {step.title}
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>{step.description}</p>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContentCard title="Mainnet gate #5">
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.5rem" }}>
              {dashboard.mainnet_gate.criteria}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: dashboard.mainnet_gate.eligible ? "var(--accent)" : "var(--text-muted)", margin: 0 }}>
              {dashboard.mainnet_gate.eligible
                ? "✓ Your integration counts toward the external relying party gate"
                : "Not yet eligible. complete production verify with abx_live_ key"}
            </p>
          </ContentCard>

          {dashboard.recent_events.length > 0 && (
            <ContentCard title="Recent API events">
              <div style={{ display: "grid", gap: "0.35rem" }}>
                {dashboard.recent_events.slice(0, 8).map((ev, i) => (
                  <div key={`${ev.endpoint}-${i}`} style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)" }}>
                    {ev.endpoint} · {ev.decision ?? ", "} · {new Date(ev.created_at).toLocaleString()}
                  </div>
                ))}
              </div>
            </ContentCard>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
            <Btn href="/integrations/relying-parties" size="sm">Integration docs →</Btn>
            <Btn href="/verify/ABX-RE-HOSP-001" variant="secondary" size="sm">Test verifier →</Btn>
          </div>
        </>
      )}
    </RedesignPage>
  );
}

const inputStyle: React.CSSProperties = {
  flex: "1 1 240px",
  padding: "0.6rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "0.82rem",
};

const btnStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#1a1408",
  fontFamily: FONT,
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
};
