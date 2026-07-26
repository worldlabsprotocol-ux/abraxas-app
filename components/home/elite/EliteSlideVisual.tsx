"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AbraxasPassportVc, AuthenticationProofArtifact, VerificationDebtMeter } from "@/components/home/cinematic/KycDocumentCards";
import { GlowOrb } from "@/components/home/productVisual/ProductVisualPrimitives";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import type { EliteSlide } from "@/lib/eliteDemoSlides";

export function EliteSlideVisual({ slide, accent }: { slide: EliteSlide; accent: string }) {
  switch (slide.visual) {
    case "hero-debt":
      return <HeroDebtVisual pills={slide.pills} accent={accent} />;
    case "hero-passport":
      return <AbraxasPassportVc pulse large />;
    case "hero-proof":
      return <AuthenticationProofArtifact hero issued pulse />;
    case "stat-row":
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${slide.stats?.length ?? 3}, 1fr)`, gap: 8, width: "100%" }}>
          {slide.stats?.map(s => (
            <div key={s.label} style={statCard(accent)}>
              <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted }}>{s.label}</div>
              <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "1rem", fontWeight: 900, color: "#FAFAFA" }}>{s.value}</div>
            </div>
          ))}
        </div>
      );
    case "layer-stack":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 360 }}>
          {["Applications", "Issuance", "Abraxas trust"].map((l, i) => (
            <motion.div
              key={l}
              animate={{ opacity: i === 2 ? 1 : 0.55, x: 0 }}
              style={{
                ...statCard(i === 2 ? accent : COSMIC_PALETTE.textMuted),
                borderColor: i === 2 ? `${accent}66` : COSMIC_PALETTE.glassBorder,
                boxShadow: i === 2 ? `0 0 24px ${accent}33` : undefined,
              }}
            >
              <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "0.82rem", fontWeight: 800 }}>{l}</span>
            </motion.div>
          ))}
        </div>
      );
    case "network-ring":
      return (
        <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
              style={{
                position: "absolute",
                inset: i * 14,
                borderRadius: "50%",
                border: `1px solid ${accent}`,
                boxShadow: `0 0 20px ${accent}33`,
              }}
            />
          ))}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>◉</div>
        </div>
      );
    case "asset-pair":
      return (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", width: "100%" }}>
          {[
            { label: "HOSP", sub: "Cielo" },
            { label: "LAND", sub: "Chickasaw" },
          ].map((asset, i) => (
            <motion.div
              key={asset.label}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              style={{ ...statCard(accent), padding: "14px 18px", textAlign: "center" }}
            >
              <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em", color: accent }}>
                {asset.label}
              </div>
              <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "0.68rem", fontWeight: 700, color: COSMIC_PALETTE.textMuted, marginTop: 4 }}>
                {asset.sub}
              </div>
            </motion.div>
          ))}
        </div>
      );
    case "api-flow":
      return (
        <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.68rem", color: accent, textAlign: "center", lineHeight: 1.8 }}>
          <div>POST /verify</div>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>↓</motion.div>
          <div>GET /proof</div>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}>↓</motion.div>
          <div style={{ color: COSMIC_PALETTE.emerald }}>proceed</div>
        </div>
      );
    case "gates":
      return (
        <div style={{ width: "100%", maxWidth: 280 }}>
          <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "2rem", fontWeight: 900, color: accent, textAlign: "center" }}>1/7</div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", marginTop: 8, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "14%" }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${accent}, ${COSMIC_PALETTE.violet})` }}
            />
          </div>
        </div>
      );
    case "claims":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {slide.pills?.map(p => (
            <span key={p} style={pillStyle(COSMIC_PALETTE.violet)}>{p}</span>
          ))}
        </div>
      );
    case "agentic-duo":
      return (
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
          <GlowOrb accent={COSMIC_PALETTE.emerald} icon="✓" size={80} />
          <motion.span animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ color: accent, fontSize: "1.5rem" }}>→</motion.span>
          <GlowOrb accent={COSMIC_PALETTE.cyan} icon="◈" size={80} />
        </div>
      );
    case "unlock-row":
      return (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {["✓", "✓", "✓"].map((c, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.2 }}
              style={{ ...pillStyle(COSMIC_PALETTE.emerald), fontSize: "1rem", padding: "8px 14px" }}
            >
              {c}
            </motion.span>
          ))}
        </div>
      );
    case "icon-hero":
    default:
      return <GlowOrb accent={accent} icon="◆" size={100} />;
  }
}

function HeroDebtVisual({ pills, accent }: { pills?: string[]; accent: string }) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const steps = [1, 2, 3, 4, 5, 6, 7];
    let i = 0;
    const t = window.setInterval(() => {
      i = (i + 1) % steps.length;
      setCount(steps[i]);
    }, 900);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
      <VerificationDebtMeter count={count} max={7} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 14 }}>
        {pills?.map(p => (
          <motion.span
            key={p}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2, repeat: Infinity, delay: pills.indexOf(p) * 0.15 }}
            style={pillStyle(accent)}
          >
            {p}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function statCard(accent: string): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${typeof accent === "string" ? `${accent}44` : COSMIC_PALETTE.glassBorder}`,
    background: "rgba(0,0,0,0.35)",
    textAlign: "center",
  };
}

function pillStyle(accent: string): React.CSSProperties {
  return {
    fontFamily: DEMO_TYPOGRAPHY.fontMono,
    fontSize: "0.58rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "5px 10px",
    borderRadius: 999,
    border: `1px solid ${accent}44`,
    color: accent,
    background: `${accent}12`,
  };
}
