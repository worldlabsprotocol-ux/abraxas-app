"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

type Summary = {
  solana_mainnet_promotion?: { overall: string; checks: { id: string; verdict: string; label: string }[] };
  institutional_api?: Record<string, string>;
};

export default function AdminInstitutionalPlanePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/institutional-plane/summary");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSummary(await res.json() as Summary);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "load_failed");
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Admin · Institutional plane
          </div>
          <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: "0.35rem 0" }}>
            Production eligibility & promotion gates
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: 0 }}>
            Operator view for partner applications, receipt validity enforcement, integration health, and Solana mainnet promotion readiness. Not a public dashboard.
          </p>
          <Link href="/admin/partner-flow/readiness" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT }}>
            Partner Flow readiness →
          </Link>
        </div>

        {err ? <p style={{ color: "#f87171" }}>{err}</p> : null}

        {summary?.institutional_api ? (
          <section style={{ marginBottom: "1.25rem", padding: "1rem", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
            <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", margin: "0 0 0.75rem" }}>Institutional APIs</h2>
            <ul style={{ fontFamily: MONO, fontSize: "0.72rem", lineHeight: 1.7, margin: 0, paddingLeft: "1.1rem" }}>
              {Object.entries(summary.institutional_api).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {summary?.solana_mainnet_promotion ? (
          <section style={{ padding: "1rem", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
            <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", margin: "0 0 0.5rem" }}>
              Solana mainnet promotion — {summary.solana_mainnet_promotion.overall}
            </h2>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", margin: "0 0 0.75rem" }}>
              Devnet proof does not establish mainnet security. No mainnet deploy from this surface.
            </p>
            <ul style={{ fontFamily: MONO, fontSize: "0.68rem", lineHeight: 1.65, margin: 0, paddingLeft: "1.1rem" }}>
              {summary.solana_mainnet_promotion.checks.map(c => (
                <li key={c.id}>{c.verdict} — {c.label}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
