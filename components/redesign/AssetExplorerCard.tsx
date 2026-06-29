"use client";
// FILE: components/redesign/AssetExplorerCard.tsx
// Premium dark asset card: photo-bleed top with verification badge,
// then a tight info zone with financial numbers and a CTA.

import { useState } from "react";
import { MotionCard } from "@/lib/motion/MotionCard";
import { VerificationBadge } from "./VerificationBadge";
import { Btn } from "./ui";
import { VERIFY_META, type ExploreAsset } from "@/lib/data/exploreAssets";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function AssetExplorerCard({ asset }: { asset: ExploreAsset }) {
  const [imgOk, setImgOk] = useState(true);
  const meta = VERIFY_META[asset.state];

  return (
    <MotionCard
      glowColor={`${meta.color}33`}
      style={{
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Photo */}
      <div style={{ position: "relative", height: 188, background: "var(--surface)" }}>
        {imgOk ? (
          <img src={asset.image} alt={asset.name} onError={() => setImgOk(false)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        color: "var(--text-muted)", fontFamily: FONT, fontSize: "0.8rem" }}>
            {asset.name}
          </div>
        )}
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <VerificationBadge label={meta.label} color={meta.color} />
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "1.05rem 1.1rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
                       letterSpacing: "0.1em", textTransform: "uppercase",
                       color: "var(--text-muted)", marginBottom: "0.4rem" }}>
          {asset.assetClass}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 700,
                       letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1.15 }}>
          {asset.name}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
                       marginTop: 3 }}>
          {asset.location}
        </div>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem",
                       margin: "0.95rem 0 0.65rem", paddingTop: "0.85rem",
                       borderTop: "1px solid var(--border)" }}>
          {[
            { l: asset.primaryLabel, v: asset.primaryValue },
            { l: asset.secondaryLabel, v: asset.secondaryValue },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                             letterSpacing: "0.08em", textTransform: "uppercase",
                             color: "var(--text-muted)", marginBottom: 3 }}>
                {m.l}
              </div>
              <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif",
                             fontSize: "0.98rem", fontWeight: 700, letterSpacing: "-0.01em",
                             color: "var(--text-primary)" }}>
                {m.v}
              </div>
            </div>
          ))}
        </div>

        {asset.score && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        alignSelf: "flex-start", padding: "0.2rem 0.55rem", borderRadius: 999,
                        background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.28)",
                        marginBottom: "0.65rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.6rem", fontWeight: 700,
                            color: "#10B981", letterSpacing: "0.04em" }}>
              Collateral score {asset.score}/100
            </span>
          </div>
        )}

        {asset.note && (
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
                         lineHeight: 1.5, marginBottom: "0.85rem" }}>
            {asset.note}
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
          <Btn
            href={asset.href}
            newTab={!!asset.external}
            onClick={asset.href ? undefined : () => { window.location.href = "/passport"; }}
            variant={asset.state === "verified" ? "primary" : "secondary"}
            size="sm"
            fullWidth
          >
            {asset.cta} →
          </Btn>
        </div>
      </div>
    </MotionCard>
  );
}
