"use client";
// FILE: components/home/institutional/PulseSlideVisuals.tsx
// Live meters + feeds for Pulse chapter slides (sour.gg level-bar style).

import { useEffect, useState } from "react";
import Link from "next/link";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import { getFeaturedThesisArticle } from "@/lib/content/blogArticles";
import { MAINNET_READINESS_MILESTONES } from "@/lib/mainnetReadiness";

const FONT = DEMO_TYPOGRAPHY.fontSans;
const MONO = DEMO_TYPOGRAPHY.fontMono;

function SourMeter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "#FAFAFA" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, color }}>
          {value} / {max}
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: `1px solid ${color}33` }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}, ${COSMIC_PALETTE.violet})`,
            borderRadius: 999,
          }}
        />
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: COSMIC_PALETTE.textMuted, marginTop: 4, textAlign: "right" }}>
        {pct}% ready
      </div>
    </div>
  );
}

export function ReadinessGatesVisual() {
  const [done, setDone] = useState(1);

  useEffect(() => {
    fetch("/api/mainnet/readiness")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.done === "number") setDone(d.done);
      })
      .catch(() => {});
  }, []);

  const total = MAINNET_READINESS_MILESTONES.length;
  const open = MAINNET_READINESS_MILESTONES.filter((m) => !m.done);

  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <SourMeter label="Mainnet gates" value={done} max={total} color={COSMIC_PALETTE.gold} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {MAINNET_READINESS_MILESTONES.slice(0, 4).map((m) => (
          <div
            key={m.id}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${m.done ? `${COSMIC_PALETTE.emerald}44` : "rgba(255,255,255,0.08)"}`,
              fontFamily: FONT,
              fontSize: "0.68rem",
              color: m.done ? COSMIC_PALETTE.emerald : "var(--text-secondary)",
            }}
          >
            {m.done ? "✓" : "○"} {m.label}
          </div>
        ))}
      </div>
      {open[0] && (
        <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.gold, marginTop: 10 }}>
          Next → {open[0].label}
        </div>
      )}
    </div>
  );
}

export function ReadinessVerificationVisual() {
  const [live, setLive] = useState(0);
  const [total, setTotal] = useState(7);

  useEffect(() => {
    fetch("/api/verify/layer")
      .then((r) => r.json())
      .then((d) => {
        if (d.progress) {
          setLive(d.progress.done);
          setTotal(d.progress.total);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <SourMeter label="Verification layer" value={live} max={total} color={COSMIC_PALETTE.emerald} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 8,
        }}
      >
        {["credentials-verify", "proof-lookup", "e2e-loop", "agent-readiness"].map((id) => (
          <div
            key={id}
            style={{
              padding: "8px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: MONO,
              fontSize: "0.52rem",
              color: COSMIC_PALETTE.textMuted,
              textTransform: "uppercase",
            }}
          >
            {id.replace(/-/g, " ")}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketPulseVisual() {
  const [items, setItems] = useState<{ title: string; topic: string }[]>([]);

  useEffect(() => {
    fetch("/api/market/intel")
      .then((r) => r.json())
      .then((d) => setItems((d.items ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (!items.length) {
    return (
      <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: COSMIC_PALETTE.textMuted, textAlign: "center" }}>
        Market feed loads in production
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div
          key={item.title}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: `2px solid ${COSMIC_PALETTE.gold}33`,
            background: "rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: COSMIC_PALETTE.gold, marginBottom: 4 }}>
            {item.topic.toUpperCase()}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#FAFAFA", lineHeight: 1.35 }}>
            {item.title}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BlogFeaturedVisual() {
  const article = getFeaturedThesisArticle();

  if (!article) {
    return (
      <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: COSMIC_PALETTE.textMuted }}>
        <Link href="/blog" style={{ color: COSMIC_PALETTE.cyan }}>Browse blog →</Link>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 380,
        padding: "1.25rem 1.35rem",
        borderRadius: 20,
        border: `2px solid ${COSMIC_PALETTE.violet}44`,
        background: `linear-gradient(145deg, ${COSMIC_PALETTE.violet}12, rgba(0,0,0,0.4))`,
        textAlign: "left",
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.violet, marginBottom: 8 }}>
        FEATURED
      </div>
      <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 900, color: "#FAFAFA", lineHeight: 1.25, marginBottom: 8 }}>
        {article.title}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: COSMIC_PALETTE.textSecondary, lineHeight: 1.55, margin: "0 0 12px" }}>
        {article.description.slice(0, 140)}…
      </p>
      <Link href={`/blog/${article.slug}`} style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: COSMIC_PALETTE.cyan, textDecoration: "none" }}>
        Read on blog →
      </Link>
    </div>
  );
}
