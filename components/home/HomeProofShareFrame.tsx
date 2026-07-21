"use client";
// FILE: components/home/HomeProofShareFrame.tsx
// Screenshot-worthy proof → unlock frame for social / deck reuse.

import { motion } from "framer-motion";
import { AuthenticationProofArtifact } from "@/components/home/cinematic/KycDocumentCards";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_MONO,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

const MONO = ABRAXAS_FONT_MONO;
const SANS = ABRAXAS_FONT_SANS;

/** Shareable proof artifact — designed to screenshot cleanly. */
export function HomeProofShareFrame() {
  return (
    <section
      id="proof-frame"
      aria-label="Proof to unlock flow"
      style={{
        marginBottom: "clamp(1.5rem, 4vw, 2.25rem)",
      }}
    >
      <div
        data-proof-share-frame
        style={{
          position: "relative",
          borderRadius: 24,
          overflow: "hidden",
          border: `1px solid ${COSMIC_PALETTE.gold}44`,
          background: `
            radial-gradient(ellipse 70% 55% at 50% 0%, rgba(232,197,71,0.14) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 85% 90%, rgba(167,139,250,0.12) 0%, transparent 60%),
            linear-gradient(165deg, #0A0D14 0%, #06080E 100%)
          `,
          boxShadow: "0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1.15rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: COSMIC_PALETTE.rose, opacity: 0.85 }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: COSMIC_PALETTE.gold, opacity: 0.85 }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: COSMIC_PALETTE.emerald, opacity: 0.85 }} />
          </div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: COSMIC_PALETTE.textMuted,
            }}
          >
            Abraxas · verify layer
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "clamp(1.25rem, 3vw, 2rem)",
            padding: "clamp(1.5rem, 4vw, 2.25rem)",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COSMIC_PALETTE.gold,
                marginBottom: 12,
              }}
            >
              1 · Issue credential
            </div>
            <div style={{ transform: "scale(0.95)", transformOrigin: "center center" }}>
              <AuthenticationProofArtifact hero issued pulse />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: "0 0.5rem",
            }}
          >
            <motion.div
              animate={{ opacity: [0.35, 1, 0.35], y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              style={{ fontFamily: MONO, fontSize: "1.25rem", color: COSMIC_PALETTE.gold }}
            >
              →
            </motion.div>
            <div
              style={{
                width: "100%",
                maxWidth: 280,
                padding: "1rem 1.1rem",
                borderRadius: 16,
                border: `1px solid ${COSMIC_PALETTE.violet}44`,
                background: "rgba(0,0,0,0.35)",
                fontFamily: MONO,
                fontSize: "0.68rem",
                color: COSMIC_PALETTE.textSecondary,
                lineHeight: 2,
                textAlign: "center",
              }}
            >
              <div>POST /api/credentials/verify</div>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                ↓
              </motion.div>
              <div>GET /api/proof/:id</div>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.35 }}
              >
                ↓
              </motion.div>
              <div style={{ color: COSMIC_PALETTE.emerald, fontWeight: 800 }}>agent.valid → proceed</div>
            </div>
            <motion.div
              animate={{ opacity: [0.35, 1, 0.35], y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, delay: 0.2 }}
              style={{ fontFamily: MONO, fontSize: "1.25rem", color: COSMIC_PALETTE.gold }}
            >
              →
            </motion.div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COSMIC_PALETTE.emerald,
                marginBottom: 12,
              }}
            >
              3 · Unlock action
            </div>
            <div
              style={{
                padding: "1.35rem 1.25rem",
                borderRadius: 18,
                border: `1px solid ${COSMIC_PALETTE.emerald}55`,
                background: `${COSMIC_PALETTE.emerald}10`,
                maxWidth: 280,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  fontFamily: ABRAXAS_FONT_DISPLAY,
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#FAFAFA",
                  marginBottom: 8,
                }}
              >
                Transaction cleared
              </div>
              <div style={{ fontFamily: SANS, fontSize: "0.78rem", color: COSMIC_PALETTE.textSecondary, lineHeight: 1.55 }}>
                Policy gate passed. Relying party never sees raw KYC — only the proof.
              </div>
              <div
                style={{
                  marginTop: 14,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.3)",
                  fontFamily: MONO,
                  fontSize: "0.58rem",
                  color: COSMIC_PALETTE.emerald,
                  letterSpacing: "0.06em",
                }}
              >
                receipt · signed · auditable
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "0.65rem 1.15rem",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.2)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted }}>
            Portable trust · W3C VC · server-side gates
          </span>
          <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.gold, fontWeight: 700 }}>
            abraxas.app
          </span>
        </div>
      </div>
    </section>
  );
}
