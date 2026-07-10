"use client";
// FILE: app/metrics/page.tsx
// Public protocol metrics dashboard — real Supabase counters including verification network.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import type { VerificationNetworkMetrics } from "@/lib/metrics/verificationMetrics";

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
  verification_network: VerificationNetworkMetrics;
  abra_token: {
    token_mint: string | null;
    lifetime_fees: Record<string, unknown> | null;
    partner: { claimedFees: string; unclaimedFees: string } | null;
  } | null;
  recent_bookings: Array<{ id: string; status: string; check_in: string; check_out: string; created_at: string }>;
  data_sources: { supabase: boolean; bags_api: boolean };
  updatedAt: string;
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: highlight ? "rgba(16,185,129,0.08)" : "var(--surface-inset)",
      border: `1px solid ${highlight ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
    }}>
      <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString();
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
  const v = data?.verification_network;
  const hasVerifyActivity = Boolean(v && v.data_available && v.total_presentations > 0);

  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Transparency"
        title="Live protocol metrics"
        subtitle="Real counters from Supabase — credentials issued, verification API calls, bookings, and partner interest. Updated every ~2 minutes."
      />

      {!hasVerifyActivity && (
        <div style={{
          padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1.25rem",
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)",
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6,
        }}>
          <strong style={{ color: "var(--text-primary)" }}>Design partner phase.</strong>{" "}
          Verification call counts start at zero until partners and the public tester hit{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.72rem" }}>POST /api/credentials/verify</code>.
          Try the{" "}
          <Link href="/verify?mode=credential" style={{ color: ACCENT, fontWeight: 700 }}>live credential tester</Link>{" "}
          to log the first check.
        </div>
      )}

      {err && (
        <ContentCard>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#EF4444", margin: 0 }}>{err}</p>
        </ContentCard>
      )}

      {v && v.data_available && (
        <ContentCard title="Verification network (live)">
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
            Every call to <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>/api/credentials/verify</code> is logged in{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>credential_presentations</code> — the same audit trail relying parties use.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            <Metric label="Checks (30d)" value={String(v.presentations_30d)} sub={`${v.presentations_7d} in last 7d`} highlight />
            <Metric label="Success rate (30d)" value={v.success_rate_30d != null ? `${v.success_rate_30d}%` : "—"} sub={`${v.accepted_30d} accepted · ${v.rejected_30d} denied`} />
            <Metric label="Relying parties (30d)" value={String(v.unique_verifiers_30d)} sub={`${v.unique_verifiers_all_time} all-time`} />
            <Metric label="Credentials issued (30d)" value={String(v.credentials_issued_30d)} sub={`${m?.active_credentials ?? 0} active total`} />
            <Metric label="Last verification" value={fmtRelative(v.last_presentation_at)} sub={v.last_presentation_at ? new Date(v.last_presentation_at).toLocaleString() : "No checks yet"} />
            <Metric label="Manual IDV queue" value={String(v.manual_idv_pending)} sub={`${v.manual_idv_approved} approved`} />
          </div>

          {v.top_verifiers_30d.length > 0 && (
            <>
              <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Top verifier_id (30d)
              </div>
              <div style={{ display: "grid", gap: "0.35rem", marginBottom: "0.85rem" }}>
                {v.top_verifiers_30d.map(row => (
                  <div key={row.verifier_id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
                    padding: "0.45rem 0.65rem", borderRadius: 8,
                    background: "var(--surface-inset)", border: "1px solid var(--border)",
                    fontFamily: FONT, fontSize: "0.72rem",
                  }}>
                    <code style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>{row.verifier_id}</code>
                    <span style={{ color: "var(--text-muted)" }}>{row.accepted}/{row.total} accepted</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(v.partner_api_calls_30d > 0 || v.unique_partners_30d > 0) && (
            <>
              <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem", marginTop: "0.25rem" }}>
                Partner API keys (30d)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <Metric label="Partner API calls" value={String(v.partner_api_calls_30d)} sub={`${v.partner_api_success_30d} successful`} />
                <Metric label="Active partners" value={String(v.unique_partners_30d)} sub={fmtRelative(v.last_partner_api_at)} />
              </div>
              {v.top_partners_30d.length > 0 && (
                <div style={{ display: "grid", gap: "0.35rem", marginBottom: "0.85rem" }}>
                  {v.top_partners_30d.map(row => (
                    <div key={row.partner_id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
                      padding: "0.45rem 0.65rem", borderRadius: 8,
                      background: "var(--surface-inset)", border: "1px solid var(--border)",
                      fontFamily: FONT, fontSize: "0.72rem",
                    }}>
                      <code style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>{row.partner_id}</code>
                      <span style={{ color: "var(--text-muted)" }}>{row.success}/{row.total} ok</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href="/verify?mode=credential" size="sm">Try credential verify →</Btn>
            <Btn href="/verify" variant="secondary" size="sm">Registry verifier</Btn>
          </div>
        </ContentCard>
      )}

      {m && (
        <>
          <ContentCard title="Registry & accounts">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
              <Metric label="Verified assets" value={String(m.verified_assets)} sub={`${m.pipeline_assets} in pipeline`} />
              <Metric label="Attested value" value={m.attested_value_label} sub="Cielo appraisal" />
              <Metric label="Accounts (zkLogin)" value={String(m.zklogin_wallets)} sub="Registered wallets" />
              <Metric label="Active credentials" value={String(m.active_credentials)} sub="W3C VC issued" />
              <Metric label="On-chain passports" value={String(m.on_chain_passports)} sub="Sui objects" />
              <Metric label="Featured stay" value={m.cielo_revenue_label} sub={`${m.captured_cielo_bookings} captured · ${m.pending_cielo_bookings} pending`} />
              <Metric label="Partner inquiries" value={String(m.investment_interest_count)} sub="Submitted via contact form" />
              <Metric label="Design partners" value={String(m.design_partner_applications)} sub="Integration applications" />
              <Metric label="Sponsor treasury" value={m.sponsor_configured ? "Configured" : "Pending"} sub="Gas sponsorship" />
            </div>
          </ContentCard>

          {data?.abra_token?.lifetime_fees && (
            <ContentCard title="$ABRA token (Solana · Bags.fm)">
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
                Live from Bags API when configured. Verify on-chain independently.
              </p>
              <pre style={{
                fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)", overflow: "auto", margin: 0,
                padding: "0.75rem", borderRadius: 10, background: "var(--surface-inset)", border: "1px solid var(--border)",
              }}>
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
              Verification log: credential_presentations · Partner API: partner_api_usage · Manual IDV: passport_documents
              <br />
              Last updated: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"}
            </div>
          </ContentCard>
        </>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/docs" size="lg">Documentation →</Btn>
        <Btn href="/transparency" variant="secondary" size="lg">Ops log</Btn>
        <Link href="/api/metrics/investor" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, alignSelf: "center" }}>
          Raw JSON →
        </Link>
      </div>
    </RedesignPage>
  );
}
