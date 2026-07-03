"use client";
// FILE: app/metrics/page.tsx
// Public protocol metrics dashboard for investors.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface InvestorMetrics {
  verified_assets: number;
  pipeline_assets: number;
  attested_value_label: string;
  zklogin_wallets: number;
  active_credentials: number;
  on_chain_passports: number;
  pending_cielo_bookings: number;
  captured_cielo_bookings: number;
  cielo_revenue_label: string;
  cielo_revenue_usdc: number;
  investment_interest_count: number;
  design_partner_applications: number;
  sponsor_configured: boolean;
}

interface Payload {
  metrics: InvestorMetrics;
  abra_token: {
    token_mint: string | null;
    lifetime_fees: Record<string, unknown> | null;
    partner: { claimedFees: string; unclaimedFees: string } | null;
  } | null;
  recent_bookings: Array<{ id: string; status: string; check_in: string; check_out: string; created_at: string }>;
  data_sources: { supabase: boolean; bags_api: boolean };
  updatedAt: string;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function MetricsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/metrics/investor")
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error("Failed to load");
        setData(d as Payload);
      })
      .catch(() => setErr("Could not load metrics"));
  }, []);

  const m = data?.metrics;

  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Transparency"
        title="Live protocol metrics"
        subtitle="Pulled from Supabase and public APIs. Zero means not yet configured or no activity — not fabricated placeholders."
      />

      {err && (
        <ContentCard>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#EF4444", margin: 0 }}>{err}</p>
        </ContentCard>
      )}

      {m && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <Metric label="Verified assets" value={String(m.verified_assets)} sub={`${m.pipeline_assets} in pipeline`} />
            <Metric label="Attested value" value={m.attested_value_label} sub="Cielo appraisal" />
            <Metric label="Accounts (zkLogin)" value={String(m.zklogin_wallets)} sub="Registered wallets" />
            <Metric label="Active credentials" value={String(m.active_credentials)} sub="W3C VC issued" />
            <Metric label="On-chain passports" value={String(m.on_chain_passports)} sub="Sui objects" />
            <Metric label="Featured stay" value={m.cielo_revenue_label} sub={`${m.captured_cielo_bookings} captured · ${m.pending_cielo_bookings} pending`} />
            <Metric label="Investor interest" value={String(m.investment_interest_count)} sub="Submitted via portal" />
            <Metric label="Design partners" value={String(m.design_partner_applications)} sub="Integration applications" />
            <Metric label="Sponsor treasury" value={m.sponsor_configured ? "Configured" : "Pending"} sub="Gas sponsorship" />
          </div>

          {data?.abra_token?.lifetime_fees && (
            <ContentCard title="$ABRA token (Solana · Bags.fm)">
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
                Live from Bags API when configured. Verify on-chain independently.
              </p>
              <pre style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)", overflow: "auto", margin: 0 }}>
                {JSON.stringify(data.abra_token.lifetime_fees, null, 2)}
              </pre>
            </ContentCard>
          )}

          {data && data.recent_bookings.length > 0 && (
            <ContentCard title="Recent booking activity">
              {data.recent_bookings.map(b => (
                <div key={b.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", fontFamily: FONT, fontSize: "0.75rem" }}>
                  <span style={{ color: ACCENT, fontWeight: 700, textTransform: "uppercase" }}>{b.status}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{b.check_in} → {b.check_out}</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>{b.id.slice(0, 8)}…</span>
                </div>
              ))}
            </ContentCard>
          )}

          <ContentCard title="Data sources">
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Supabase: {data?.data_sources.supabase ? "connected" : "not configured"} · Bags API: {data?.data_sources.bags_api ? "connected" : "not configured"}
              <br />
              Last updated: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"}
            </div>
          </ContentCard>
        </>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/investors" size="lg">Data room →</Btn>
        <Btn href="/transparency" variant="secondary" size="lg">Ops log</Btn>
        <Link href="/api/metrics/investor" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, alignSelf: "center" }}>
          Raw JSON →
        </Link>
      </div>
    </RedesignPage>
  );
}
