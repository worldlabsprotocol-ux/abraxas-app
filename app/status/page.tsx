"use client";
// FILE: app/status/page.tsx
// Protocol Status — public health dashboard for infrastructure operators and partners.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { Btn } from "@/components/redesign/ui";
import { protocolHealthLabel, type ProtocolHealthLabel, type ProtocolSubsystemStatus } from "@/lib/protocol/protocolStatusShared";
import { buildHomeStatCards, type PublicMetrics } from "@/lib/home/publicMetrics";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = "'JetBrains Mono',monospace";

const STATUS_COLOR: Record<ProtocolHealthLabel, string> = {
  operational: "#10B981",
  degraded: "#F59E0B",
  not_configured: "#EF4444",
};

interface StatusPayload {
  ok: boolean;
  updatedAt: string;
  subsystems: ProtocolSubsystemStatus[];
  metrics: {
    verified_identities: number | null;
    pending_reviews: number | null;
    credentials_issued_30d: number | null;
    verified_assets: number | null;
  };
}

function HealthRow({ item }: { item: ProtocolSubsystemStatus }) {
  const color = STATUS_COLOR[item.status];
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem",
      padding: "0.85rem 1rem", borderRadius: 12,
      background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
          {item.label}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
          {item.detail}
        </p>
      </div>
      <span style={{
        flexShrink: 0, fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800,
        padding: "0.3rem 0.55rem", borderRadius: 999,
        color, border: `1px solid ${color}55`, background: `${color}14`,
        whiteSpace: "nowrap",
      }}>
        {protocolHealthLabel(item.status)}
      </span>
    </div>
  );
}

export default function ProtocolStatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetch("/api/protocol/status")
      .then((r) => r.json())
      .then((payload: StatusPayload) => setData(payload))
      .catch(() => setError(true));
  }, []);

  const metricCards = buildHomeStatCards(data ? {
    verified_assets: data.metrics.verified_assets ?? undefined,
    verification_network: {
      manual_idv_pending: data.metrics.pending_reviews ?? undefined,
      manual_idv_approved: data.metrics.verified_identities ?? undefined,
      credentials_issued_30d: data.metrics.credentials_issued_30d ?? undefined,
    },
  } satisfies PublicMetrics : null);

  return (
    <RedesignPage maxWidth={820}>
      <header style={{ marginBottom: "1.5rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.35rem" }}>Infrastructure</div>
        <h1 style={{ fontFamily: FONT, fontSize: "1.75rem", fontWeight: 900, margin: "0 0 0.5rem", letterSpacing: "-0.03em" }}>
          Protocol status
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          Abraxas is reusable identity infrastructure — not just a website. Live subsystem health and protocol metrics.
        </p>
      </header>

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#EF4444" }}>
          Could not load protocol status. Try again shortly.
        </p>
      )}

      {data && (
        <>
          <section aria-labelledby="protocol-health-heading" style={{ marginBottom: "1.5rem" }}>
            <h2 id="protocol-health-heading" style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, margin: "0 0 0.75rem" }}>
              Protocol health
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {data.subsystems.map((item) => (
                <HealthRow key={item.id} item={item} />
              ))}
            </div>
          </section>

          <section aria-labelledby="protocol-metrics-heading" style={{ marginBottom: "1.5rem" }}>
            <h2 id="protocol-metrics-heading" style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, margin: "0 0 0.75rem" }}>
              Current protocol metrics
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
              {metricCards.map((card) => (
                <div key={card.key} style={{
                  padding: "1rem", borderRadius: 12,
                  background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
                }}>
                  <div style={{ fontFamily: MONO, fontSize: "1.2rem", fontWeight: 800, color: "var(--accent)" }}>
                    {card.value}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.65rem 0 0" }}>
              Updated {new Date(data.updatedAt).toLocaleString()}
            </p>
          </section>
        </>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/metrics" variant="secondary" size="sm">Full metrics →</Btn>
        <Btn href="/passport" size="sm">Create Passport</Btn>
        <Link href="/api/protocol/status" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          Raw JSON →
        </Link>
      </div>
    </RedesignPage>
  );
}
