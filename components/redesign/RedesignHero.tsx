"use client";
// FILE: components/redesign/RedesignHero.tsx
// Split hero: value proposition + trust stats on the left, a premium
// "credential" visual on the right. Sits over the global ambient glow.

import { motion } from "framer-motion";
import { Btn } from "./ui";
import { VerificationBadge } from "./VerificationBadge";
import { PassportStampIcon, type PassportStampKind } from "@/components/identity/PassportStampIcon";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const VIOLET = "#8B5CF6";

const STAMP_CHIPS: { kind: PassportStampKind; label: string }[] = [
  { kind: "identity", label: "Identity" },
  { kind: "biometric", label: "Biometric" },
  { kind: "owner", label: "Asset Owner" },
  { kind: "compliance", label: "Compliance" },
];

function CredentialCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      style={{
        position: "relative", borderRadius: 20, overflow: "hidden",
        border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
        boxShadow: "var(--shadow-glow)",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                     padding: "0.9rem 1.15rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <svg width={22} height={22} viewBox="0 0 40 40" fill="none">
            <polygon points="20,2 38,20 20,38 2,20" stroke={ACCENT} strokeWidth="2" fill="none" />
            <polygon points="20,8 32,20 20,32 8,20" stroke={ACCENT} strokeWidth="1.5" fill={`${ACCENT}22`} />
            <circle cx="20" cy="20" r="3" fill={ACCENT} />
          </svg>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 900,
                          letterSpacing: "0.16em", color: ACCENT }}>ABRAXAS PASSPORT</span>
        </div>
        <VerificationBadge label="Verified" color={ACCENT} check />
      </div>

      {/* body */}
      <div style={{ padding: "1.15rem 1.15rem 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: "0.6rem", letterSpacing: "0.1em",
                          textTransform: "uppercase", color: "var(--text-muted)" }}>Trust level</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem",
                          fontFamily: FONT, fontSize: "0.6rem", fontWeight: 800,
                          color: VIOLET, letterSpacing: "0.08em",
                          padding: "0.15rem 0.5rem", borderRadius: 999,
                          background: `${VIOLET}1A`, border: `1px solid ${VIOLET}40` }}>
            ◆ ELITE · 9/11
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)",
                       overflow: "hidden", marginBottom: "1.1rem" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: "82%" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            style={{ height: "100%", background: ACCENT }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem",
                       marginBottom: "1.1rem" }}>
          {STAMP_CHIPS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.5 + i * 0.08 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%",
                             border: `1.5px solid ${ACCENT}`, background: `${ACCENT}1A`,
                             display: "flex", alignItems: "center", justifyContent: "center",
                             color: ACCENT, boxShadow: `0 0 12px ${ACCENT}30` }}>
                <PassportStampIcon kind={s.kind} size={20} color={ACCENT} />
              </div>
              <span style={{ fontFamily: FONT, fontSize: "0.5rem", fontWeight: 700,
                              letterSpacing: "0.05em", textTransform: "uppercase",
                              color: "var(--text-muted)", textAlign: "center" }}>{s.label}</span>
            </motion.div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                       padding: "0.7rem 0.85rem", borderRadius: 10,
                       background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem",
                           letterSpacing: "0.1em", textTransform: "uppercase",
                           color: "var(--text-muted)" }}>Credential</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem",
                           fontWeight: 700, color: "var(--text-secondary)" }}>did:sol:7xKX…AsU</div>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem",
                          color: ACCENT, letterSpacing: "0.06em" }}>W3C · SOLANA</span>
        </div>
      </div>
    </motion.div>
  );
}

export function RedesignHero() {
  return (
    <section style={{ position: "relative", zIndex: 1, padding: "clamp(2.5rem, 7vw, 5.5rem) 0 clamp(2rem,5vw,3.5rem)" }}>
      <div className="rd-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr",
                                              gap: "clamp(2rem, 5vw, 3.5rem)", alignItems: "center" }}>
        <motion.div variants={staggerContainer(0.1, 0.05)} initial="hidden" animate="show">
          <motion.div variants={staggerItem} style={{ marginBottom: "1.25rem" }}>
            <VerificationBadge label="Trust infrastructure for tokenized assets" color={ACCENT} />
          </motion.div>

          <motion.h1 variants={staggerItem} style={{
            fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 0.98, color: "var(--text-primary)",
            margin: "0 0 1.2rem",
          }}>
            Verify once.<br />
            <span style={{ color: ACCENT }}>Transact everywhere.</span>
          </motion.h1>

          <motion.p variants={staggerItem} style={{
            fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
            lineHeight: 1.7, maxWidth: 540, margin: "0 0 1.75rem",
          }}>
            One identity check. One asset attestation. A portable, on-chain credential
            that every protocol, lender, and marketplace accepts, no re-KYC, no redundant
            uploads, no re-proving who you are.
          </motion.p>

          <motion.div variants={staggerItem} style={{ display: "flex", gap: "0.75rem",
                                                       flexWrap: "wrap", marginBottom: "2rem" }}>
            <Btn href="/passport" size="lg">Launch app →</Btn>
            <Btn href="/developers" variant="secondary" size="lg">Build with Abraxas →</Btn>
            <Btn href="#assets" variant="ghost" size="lg">Explore verified assets</Btn>
            <Btn href="/terminal?demo=1" variant="ghost" size="lg">Take a tour</Btn>
          </motion.div>
          <motion.p variants={staggerItem} style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
            margin: "0", maxWidth: 480,
          }}>
            No wallet required to browse or verify. Connect in the nav when you are ready to pay in stablecoin.
          </motion.p>
        </motion.div>

        <div style={{ position: "relative" }}>
          <CredentialCard />
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .rd-hero-grid { grid-template-columns: 1.05fr 0.95fr !important; }
        }
      `}</style>
    </section>
  );
}
