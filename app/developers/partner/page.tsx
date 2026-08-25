"use client";
// FILE: app/developers/partner/page.tsx
// Partner self-service portal. authenticate with issued abx_ API key.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PartnerPortalAuthenticatedView } from "@/components/partner/PartnerPortalAuthenticatedView";
import type { CapabilityAwarePortalOnboarding } from "@/lib/partner/partnerPortalCapabilities";
import type { PartnerDashboardReadiness } from "@/lib/partner/partnerPortalReadiness";

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
  onboarding: CapabilityAwarePortalOnboarding;
  readiness: PartnerDashboardReadiness;
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
        subtitle="View API usage and onboarding progress for this API key. Keys are server-side only — never expose in client apps."
      />

      {!dashboard ? (
        <ContentCard title="Authenticate with your API key">
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
            Use the <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>abx_test_</code> or{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>abx_live_</code> key issued after application approval.
            No key yet? <Link href="/design-partner" style={{ color: "var(--accent)", fontWeight: 700 }}>Apply →</Link>
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "stretch" }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="abx_test_… or abx_live_…"
              autoComplete="off"
              inputMode="text"
              style={{ ...inputStyle, minWidth: 0 }}
            />
            <button type="button" onClick={() => void loadDashboard(apiKey)} style={btnStyle}>
              View dashboard
            </button>
          </div>
          {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#ef4444", marginTop: "0.5rem" }}>{error}</p>}
        </ContentCard>
      ) : (
        <PartnerPortalAuthenticatedView
          apiKey={apiKey}
          partnerId={dashboard.partner_id}
          company={dashboard.company}
          status={dashboard.status}
          keyPrefix={dashboard.key_prefix}
          scopes={dashboard.scopes}
          stats={dashboard.stats}
          recentEvents={dashboard.recent_events}
          onboarding={dashboard.onboarding}
          readiness={dashboard.readiness}
          mainnetGate={dashboard.mainnet_gate}
          onLogout={logout}
        />
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
