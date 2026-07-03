"use client";
// FILE: app/transparency/page.tsx
// Live operational transparency — real Supabase events, not mock vault logs.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface BookingEvent {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  guest_name?: string;
  created_at: string;
  payment_tx_digest?: string | null;
}

interface Payload {
  metrics: {
    zklogin_wallets: number;
    active_credentials: number;
    captured_cielo_bookings: number;
    cielo_revenue_usdc: number;
  };
  recent_bookings: BookingEvent[];
  updatedAt: string;
  data_sources: { supabase: boolean };
}

export default function TransparencyPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics/investor")
      .then(r => r.json())
      .then(d => setData(d as Payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RedesignPage maxWidth={860}>
      <PageHeader
        eyebrow="Transparency"
        title="Operational log"
        subtitle="Real events from Abraxas infrastructure. We replaced legacy mock vault defense logs with live booking and credential activity."
      />

      <ContentCard title="Protocol activity summary">
        {data ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
            {[
              { l: "Wallets registered", v: data.metrics.zklogin_wallets },
              { l: "Credentials active", v: data.metrics.active_credentials },
              { l: "Captured stays", v: data.metrics.captured_cielo_bookings },
              { l: "Cielo USDC revenue", v: data.metrics.cielo_revenue_usdc > 0 ? `$${data.metrics.cielo_revenue_usdc}` : "—" },
            ].map(row => (
              <div key={row.l} style={{ padding: "0.75rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>{row.v}</div>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>{row.l}</div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>Loading…</p>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
            Connect Supabase to show live events.
          </p>
        )}
      </ContentCard>

      <ContentCard title="Recent booking events">
        {!data?.data_sources.supabase && (
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
            Supabase not configured in this environment.
          </p>
        )}
        {data?.recent_bookings.length === 0 && data?.data_sources.supabase && (
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
            No booking events yet. First captured stay will appear here.
          </p>
        )}
        {data?.recent_bookings.map(b => (
          <div key={b.id} style={{
            padding: "0.85rem 0", borderBottom: "1px solid var(--border)",
            fontFamily: FONT, fontSize: "0.78rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
              <span style={{ fontWeight: 700, color: ACCENT, textTransform: "uppercase" }}>{b.status}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {new Date(b.created_at).toLocaleString()}
              </span>
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              {b.check_in} → {b.check_out}
              {b.guest_name ? ` · ${b.guest_name}` : ""}
            </div>
            {b.payment_tx_digest && (
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 4, wordBreak: "break-all" }}>
                Tx: {b.payment_tx_digest}
              </div>
            )}
          </div>
        ))}
      </ContentCard>

      <ContentCard title="What we publish vs. keep private">
        <ul style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0, paddingLeft: "1.1rem" }}>
          <li><strong style={{ color: "var(--text-primary)" }}>Public:</strong> aggregate metrics, booking status, on-chain tx digests, credential counts</li>
          <li><strong style={{ color: "var(--text-primary)" }}>Private:</strong> government ID images, raw Veriff data, guest PII beyond what booking requires</li>
          <li><strong style={{ color: "var(--text-primary)" }}>Principle:</strong> sensitive data stays off-chain; only consented proofs and attestations anchor publicly</li>
        </ul>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/metrics" size="lg">Full metrics dashboard →</Btn>
        <Btn href="/investors" variant="secondary" size="lg">Data room</Btn>
        <Link href="/api/metrics/investor" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, alignSelf: "center" }}>
          API JSON →
        </Link>
      </div>
    </RedesignPage>
  );
}
