"use client";
// FILE: components/home/HomeLiveStats.tsx
// Live protocol counters from /api/metrics/public.

import { useEffect, useState } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = "'JetBrains Mono',monospace";

interface PublicMetrics {
  verified_assets?: number;
  active_credentials?: number;
  zklogin_wallets?: number;
  verification_network?: {
    manual_idv_pending?: number;
    manual_idv_approved?: number;
    credentials_issued_30d?: number;
  };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      padding: "1rem 1.1rem",
      borderRadius: 12,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      minWidth: 140,
      flex: "1 1 140px",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "1.35rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
        {label}
      </div>
    </div>
  );
}

export function HomeLiveStats() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);

  useEffect(() => {
    void fetch("/api/metrics/public")
      .then(r => r.json())
      .then((data: { metrics?: PublicMetrics }) => setMetrics(data.metrics ?? null))
      .catch(() => setMetrics(null));
  }, []);

  const vn = metrics?.verification_network;
  const pending = vn?.manual_idv_pending ?? 0;
  const verifiedIds = vn?.manual_idv_approved ?? 0;
  const credentials = metrics?.active_credentials ?? vn?.credentials_issued_30d ?? 0;
  const assets = metrics?.verified_assets ?? 0;

  return (
    <section aria-labelledby="home-live-stats">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
        Live protocol
      </div>
      <h2 id="home-live-stats" style={{
        fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 1rem",
      }}>
        Trust in motion
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <StatCard label="Verified identities" value={verifiedIds} />
        <StatCard label="Verified assets" value={assets} />
        <StatCard label="Pending reviews" value={pending} />
        <StatCard label="Active credentials" value={credentials} />
      </div>
    </section>
  );
}
