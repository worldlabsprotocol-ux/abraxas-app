"use client";
// FILE: components/partners/PartnerExecutionCards.tsx
// Shared partner cards. no placeholder names in public UI.

import Link from "next/link";
import {
  REAL_PARTNERS,
  partnerDisplayName,
  partnerDisplaySubtitle,
  partnerStatusLabel,
  type RealPartnerRecord,
} from "@/lib/partnerStatus";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function PartnerExecutionCards({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "0.75rem",
    }}>
      {REAL_PARTNERS.map(p => (
        <PartnerCard key={p.id} partner={p} compact={compact} />
      ))}
    </div>
  );
}

function PartnerCard({ partner: p, compact }: { partner: RealPartnerRecord; compact: boolean }) {
  const subtitle = partnerDisplaySubtitle(p);
  return (
    <div style={{
      padding: compact ? "0.85rem" : "1rem 1.05rem",
      borderRadius: 14,
      border: `1px solid ${ACCENT}33`,
      background: `linear-gradient(145deg, ${ACCENT}0c 0%, var(--surface) 55%)`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
        <span style={{ fontFamily: FONT, fontSize: compact ? "0.82rem" : "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
          {partnerDisplayName(p)}
        </span>
        <span style={{
          fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
          color: ACCENT, letterSpacing: "0.06em",
        }}>
          {partnerStatusLabel(p.statusBucket)}
        </span>
      </div>
      {subtitle && (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.45rem" }}>
          {subtitle}
        </p>
      )}
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
        {p.summary}
      </p>
      <Link href={p.proofHref} style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
      }}>
        {p.proofLabel} →
      </Link>
    </div>
  );
}
