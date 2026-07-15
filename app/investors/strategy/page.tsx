"use client";
// FILE: app/investors/strategy/page.tsx
// Four-pillar strategic roadmap for VC diligence.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { STRATEGIC_PILLARS, PILLAR_STATUS_COLOR } from "@/lib/strategicPriorities";
import { mainnetReadinessProgress } from "@/lib/mainnetReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function StrategyPage() {
  const mainnet = mainnetReadinessProgress();

  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Strategic roadmap"
        title="Four pillars to $100M protocol credibility"
        subtitle="Honest milestone sequencing — no timeline promises. Each pillar has live evidence or an explicit in-progress state."
      />

      <div style={{
        padding: "1rem 1.15rem", borderRadius: 14,
        border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
        marginBottom: "1.25rem",
      }}>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.65rem" }}>
          Mainnet readiness: <strong style={{ color: "var(--text-primary)" }}>{mainnet.done}/{mainnet.total} gates</strong> complete.
          Pillars below map to the public checklist on the roadmap.
        </p>
        <Btn href="/roadmap#mainnet-readiness" size="sm" variant="secondary">
          View mainnet checklist →
        </Btn>
      </div>

      <div style={{ display: "grid", gap: "1.25rem", marginBottom: "2rem" }}>
        {STRATEGIC_PILLARS.map(pillar => (
          <ContentCard key={pillar.id} title={`${pillar.order}. ${pillar.title}`}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
              <span style={{
                fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                padding: "0.2rem 0.5rem", borderRadius: 999,
                color: PILLAR_STATUS_COLOR[pillar.status],
                background: `${PILLAR_STATUS_COLOR[pillar.status]}18`,
                border: `1px solid ${PILLAR_STATUS_COLOR[pillar.status]}44`,
              }}>
                {pillar.statusLabel}
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.5rem", lineHeight: 1.4 }}>
              {pillar.headline}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
              {pillar.why}
            </p>

            <div style={{ display: "grid", gap: "0.4rem", marginBottom: "1rem" }}>
              {pillar.milestones.map(m => (
                <Link key={m.label} href={m.href} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  textDecoration: "none", padding: "0.35rem 0",
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    background: m.done ? `${ACCENT}22` : "var(--surface)",
                    border: `1.5px solid ${m.done ? ACCENT : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.55rem", color: m.done ? ACCENT : "var(--text-muted)",
                  }}>
                    {m.done ? "✓" : ""}
                  </span>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.78rem",
                    color: m.done ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: m.done ? 600 : 400,
                  }}>
                    {m.label}
                  </span>
                </Link>
              ))}
            </div>

            <Btn href={pillar.primaryHref} size="sm">{pillar.primaryCta}</Btn>
          </ContentCard>
        ))}
      </div>

      <div style={{
        padding: "1.25rem", borderRadius: 14, textAlign: "center",
        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
        marginBottom: "2rem",
      }}>
        <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
          The sequence is deliberate: prove external reliance → institutional case study → audit + bounty → team scale.
          Skipping any pillar creates diligence gaps VCs will find anyway.
        </p>
        <Btn href="/investors/pitch" size="lg">View pitch deck →</Btn>
      </div>
    </RedesignPage>
  );
}
