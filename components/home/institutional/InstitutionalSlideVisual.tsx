"use client";

import { motion } from "framer-motion";
import { AbraxasPassportVc, AuthenticationProofArtifact } from "@/components/home/cinematic/KycDocumentCards";
import { ACCENT, CONCEPT_TYPE, PREMIUM_FONT, PREMIUM_MONO } from "@/components/home/cinematic/demoPremium";
import { GlowOrb } from "@/components/home/productVisual/ProductVisualPrimitives";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import type { InstitutionalSlide } from "@/lib/institutionalMasterSlides";
import {
  RWA_INSTITUTION_QUESTIONS,
  RWA_THESIS_MARKET_STATS,
  RWA_TOKENIZATION_STEPS,
} from "@/lib/rwaTokenizationThesis";
import { InstitutionalProductEmbed } from "./InstitutionalProductEmbed";
import {
  BlogFeaturedVisual,
  MarketPulseVisual,
  ReadinessGatesVisual,
  ReadinessVerificationVisual,
} from "./PulseSlideVisuals";

const ACCENT_CYAN = COSMIC_PALETTE.cyan;

type Props = {
  slide: InstitutionalSlide;
  accent?: string;
};

export function InstitutionalSlideVisual({ slide, accent = ACCENT_CYAN }: Props) {
  const props = slide.visualProps ?? {};

  switch (slide.visual) {
    case "market":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: "100%", maxWidth: 480 }}>
          {RWA_THESIS_MARKET_STATS.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={visualCard(accent)}
            >
              <div style={microLabel}>{s.label}</div>
              <div style={{ fontFamily: PREMIUM_FONT, fontSize: "1.1rem", fontWeight: 900, color: COSMIC_PALETTE.gold }}>
                {s.value}
              </div>
              <div style={{ ...microLabel, marginTop: 4, fontSize: "0.48rem" }}>{s.detail}</div>
            </motion.div>
          ))}
        </div>
      );

    case "define":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 420 }}>
          {["Real estate", "Bonds", "Private credit", "Metals", "Carbon", "Art"].map((a, i) => (
            <motion.span
              key={a}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              style={pill(accent)}
            >
              {a}
            </motion.span>
          ))}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: "100%", textAlign: "center", fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: accent, marginTop: 4 }}
          >
            on-chain ownership · shared audit trail
          </motion.div>
        </div>
      );

    case "steps":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 6, width: "100%", maxWidth: 520 }}>
          {RWA_TOKENIZATION_STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{ ...visualCard(COSMIC_PALETTE.gold), padding: "8px 6px" }}
            >
              <div style={{ fontFamily: PREMIUM_MONO, fontSize: "0.5rem", color: COSMIC_PALETTE.gold, fontWeight: 800 }}>
                {s.step}
              </div>
              <div style={{ fontFamily: PREMIUM_FONT, fontSize: "0.62rem", fontWeight: 700, color: COSMIC_PALETTE.textPrimary, lineHeight: 1.2 }}>
                {s.title}
              </div>
            </motion.div>
          ))}
        </div>
      );

    case "gap":
    case "institution-questions": {
      const questions = (props.questions as string[] | undefined) ?? [...RWA_INSTITUTION_QUESTIONS];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 400 }}>
          {questions.map((q, i) => (
            <motion.div
              key={q}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                fontFamily: PREMIUM_FONT,
                fontSize: "0.72rem",
                color: COSMIC_PALETTE.textSecondary,
                padding: "8px 12px",
                borderRadius: 10,
                borderLeft: `3px solid ${COSMIC_PALETTE.rose}`,
                background: "rgba(244,114,182,0.06)",
                textAlign: "left",
              }}
            >
              {q}
            </motion.div>
          ))}
        </div>
      );
    }

    case "examples":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {["BlackRock BUIDL", "Private credit", "Cielo Sunrise", "Chickasaw"].map((ex, i) => (
            <motion.span
              key={ex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              style={pill(COSMIC_PALETTE.emerald)}
            >
              {ex}
            </motion.span>
          ))}
        </div>
      );

    case "abraxas":
      return (
        <motion.div
          animate={{ boxShadow: [`0 0 24px ${COSMIC_PALETTE.emerald}22`, `0 0 48px ${COSMIC_PALETTE.emerald}44`, `0 0 24px ${COSMIC_PALETTE.emerald}22`] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            border: `1px solid ${COSMIC_PALETTE.emerald}55`,
            background: `linear-gradient(135deg, ${COSMIC_PALETTE.emerald}14, transparent)`,
            textAlign: "center",
          }}
        >
          <div style={{ ...microLabel, color: COSMIC_PALETTE.emerald }}>VERIFY LAYER</div>
          <div style={{ fontFamily: PREMIUM_FONT, fontSize: "1.35rem", fontWeight: 900, color: COSMIC_PALETTE.textPrimary }}>
            Abraxas Passport
          </div>
          <div style={{ ...microLabel, marginTop: 6 }}>agent.proceed · agent.valid · W3C VC</div>
        </motion.div>
      );

    case "audience-map": {
      const audiences = (props.audiences as { label: string; desc: string; icon: string }[]) ?? [];
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, width: "100%", maxWidth: 400 }}>
          {audiences.map((a, i) => (
            <motion.div
              key={a.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={visualCard(accent)}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{a.icon}</div>
              <div style={{ fontFamily: PREMIUM_FONT, fontSize: "0.78rem", fontWeight: 800, color: COSMIC_PALETTE.textPrimary }}>
                {a.label}
              </div>
              <div style={{ ...microLabel, marginTop: 2 }}>{a.desc}</div>
            </motion.div>
          ))}
        </div>
      );
    }

    case "verify-loop": {
      const steps = ["Passport", "Policy", "Receipt", "Unlock"];
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <motion.div
                animate={{ scale: [1, 1.05, 1], borderColor: [`${accent}44`, `${accent}aa`, `${accent}44`] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                style={{
                  ...visualCard(accent),
                  minWidth: 72,
                  borderColor: `${accent}66`,
                }}
              >
                <div style={{ fontFamily: PREMIUM_FONT, fontSize: "0.68rem", fontWeight: 800 }}>{s}</div>
              </motion.div>
              {i < steps.length - 1 && (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3], x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                  style={{ color: accent, fontSize: "1.1rem" }}
                >
                  →
                </motion.span>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "hero-passport":
      return <AbraxasPassportVc pulse large />;

    case "hero-proof":
      return <AuthenticationProofArtifact hero issued pulse />;

    case "proof-flow":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            width: "100%",
            maxWidth: 360,
            margin: "0 auto",
          }}
        >
          <div style={{ transform: "scale(0.92)", transformOrigin: "center center" }}>
            <AuthenticationProofArtifact hero issued pulse />
          </div>
          <div
            style={{
              fontFamily: DEMO_TYPOGRAPHY.fontMono,
              fontSize: "0.68rem",
              color: accent,
              textAlign: "center",
              lineHeight: 2,
              width: "100%",
            }}
          >
            <div>POST /api/credentials/verify</div>
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              ↓
            </motion.div>
            <div>GET /api/proof/:id</div>
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}>
              ↓
            </motion.div>
            <div style={{ color: COSMIC_PALETTE.emerald }}>agent.valid → proceed</div>
          </div>
        </div>
      );

    case "trust-silo":
      return (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", width: "100%", maxWidth: 420 }}>
          {["Issuer", "Bank", "Platform"].map((node, i) => (
            <motion.div
              key={node}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              style={{ ...visualCard(COSMIC_PALETTE.rose), minWidth: 100, flex: "1 1 100px" }}
            >
              <div style={{ fontFamily: PREMIUM_FONT, fontSize: "0.78rem", fontWeight: 800, color: "#FAFAFA" }}>{node}</div>
              <div style={{ ...microLabel, marginTop: 6, color: COSMIC_PALETTE.rose }}>KYC again</div>
            </motion.div>
          ))}
          <motion.div
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: "100%", textAlign: "center", fontFamily: PREMIUM_MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted, marginTop: 4 }}
          >
            siloed checks · no reusable proof
          </motion.div>
        </div>
      );

    case "live-status-panel":
      return (
        <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Sandbox", value: "Live", color: COSMIC_PALETTE.emerald },
              { label: "Signed proofs", value: "On", color: accent },
              { label: "Mainnet gates", value: "1/7", color: COSMIC_PALETTE.gold },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                style={{ ...visualCard(s.color) }}
              >
                <div style={microLabel}>{s.label}</div>
                <div style={{ fontFamily: PREMIUM_FONT, fontSize: "1rem", fontWeight: 900, color: "#FAFAFA" }}>{s.value}</div>
              </motion.div>
            ))}
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "14%" }}
              transition={{ duration: 1 }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${COSMIC_PALETTE.gold}, ${COSMIC_PALETTE.violet})` }}
            />
          </div>
        </div>
      );

    case "embed-passport":
      return <InstitutionalProductEmbed type="passport" />;

    case "embed-unlock":
      return <InstitutionalProductEmbed type="unlock" />;

    case "embed-dashboard":
      return <InstitutionalProductEmbed type="dashboard" />;

    case "stat-row": {
      const stats = (props.stats as { label: string; value: string }[]) ?? [];
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length || 3}, 1fr)`, gap: 8, width: "100%", maxWidth: 400 }}>
          {stats.map((s) => (
            <div key={s.label} style={visualCard(accent)}>
              <div style={microLabel}>{s.label}</div>
              <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "1rem", fontWeight: 900, color: "#FAFAFA" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "layer-stack": {
      const layers = (props.layers as string[]) ?? ["Partner app", "Abraxas verify", "Chain / settlement"];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 360 }}>
          {layers.map((l, i) => (
            <motion.div
              key={l}
              animate={{ opacity: i === 1 ? 1 : 0.6 }}
              style={{
                ...visualCard(i === 1 ? accent : COSMIC_PALETTE.textMuted),
                borderColor: i === 1 ? `${accent}66` : COSMIC_PALETTE.glassBorder,
                boxShadow: i === 1 ? `0 0 24px ${accent}33` : undefined,
                textAlign: "left",
              }}
            >
              <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "0.82rem", fontWeight: 800 }}>{l}</span>
            </motion.div>
          ))}
        </div>
      );
    }

    case "network-ring": {
      const nodes = (props.nodes as string[]) ?? [];
      return (
        <div style={{ position: "relative", width: "100%", maxWidth: 320, height: 160 }}>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.85, 0.35] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                style={{
                  position: "absolute",
                  width: 80 + i * 28,
                  height: 80 + i * 28,
                  left: -(40 + i * 14),
                  top: -(40 + i * 14),
                  borderRadius: "50%",
                  border: `1px solid ${accent}`,
                  boxShadow: `0 0 20px ${accent}33`,
                }}
              />
            ))}
            <div
              style={{
                position: "relative",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: `${accent}22`,
                border: `1px solid ${accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: PREMIUM_FONT,
                fontSize: "0.6rem",
                fontWeight: 800,
                color: accent,
              }}
            >
              {(props.center as string) ?? "Passport"}
            </div>
          </div>
          {nodes.map((n, i) => {
            const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 42;
            const y = 50 + Math.sin(angle) * 42;
            return (
              <motion.span
                key={n}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  ...pill(accent),
                  fontSize: "0.5rem",
                }}
              >
                {n}
              </motion.span>
            );
          })}
        </div>
      );
    }

    case "api-flow": {
      const steps = (props.steps as string[]) ?? ["POST /verify", "GET /proof/:id", "Partner act"];
      return (
        <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.72rem", color: accent, textAlign: "center", lineHeight: 2 }}>
          {steps.map((step, i) => (
            <div key={step}>
              <div>{step}</div>
              {i < steps.length - 1 && (
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}>
                  ↓
                </motion.div>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "gates": {
      const gates = (props.gates as string[]) ?? ["Identity", "Accreditation", "Jurisdiction", "Asset policy"];
      return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 10 }}>
            {gates.map((g, i) => (
              <motion.span
                key={g}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                style={pill(accent)}
              >
                {g}
              </motion.span>
            ))}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.2 }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${accent}, ${COSMIC_PALETTE.violet})` }}
            />
          </div>
        </div>
      );
    }

    case "agentic-duo":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
            <GlowOrb accent={COSMIC_PALETTE.emerald} icon="✓" size={72} />
            <motion.span animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ color: accent, fontSize: "1.5rem" }}>
              →
            </motion.span>
            <GlowOrb accent={COSMIC_PALETTE.cyan} icon="◈" size={72} />
          </div>
          <div style={{ display: "flex", gap: 24, fontFamily: PREMIUM_MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted }}>
            <span>{(props.left as string) ?? "Act layer"}</span>
            <span>{(props.right as string) ?? "Verify layer"}</span>
          </div>
        </div>
      );

    case "unlock-row": {
      const assets = (props.assets as string[]) ?? ["Debt", "Equity", "Fund"];
      return (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {assets.map((a, i) => (
            <motion.div
              key={a}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.15 }}
              style={{
                ...visualCard(COSMIC_PALETTE.emerald),
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: COSMIC_PALETTE.emerald, fontWeight: 900 }}>✓</span>
              <span style={{ fontFamily: PREMIUM_FONT, fontSize: "0.75rem", fontWeight: 700 }}>{a}</span>
            </motion.div>
          ))}
        </div>
      );
    }

    case "icon-hero":
      return <GlowOrb accent={accent} icon={(props.icon as string) ?? "◆"} size={100} />;

    case "readiness-gates":
      return <ReadinessGatesVisual />;

    case "readiness-verification":
      return <ReadinessVerificationVisual />;

    case "market-pulse":
      return <MarketPulseVisual />;

    case "blog-featured":
      return <BlogFeaturedVisual />;

    default:
      return <GlowOrb accent={accent} icon="◆" size={100} />;
  }
}

function visualCard(accent: string): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${accent}44`,
    background: "rgba(0,0,0,0.35)",
    textAlign: "center",
  };
}

function pill(accent: string): React.CSSProperties {
  return {
    fontFamily: PREMIUM_MONO,
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

const microLabel: React.CSSProperties = {
  fontFamily: PREMIUM_MONO,
  fontSize: CONCEPT_TYPE.monoSm,
  color: COSMIC_PALETTE.textMuted,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
