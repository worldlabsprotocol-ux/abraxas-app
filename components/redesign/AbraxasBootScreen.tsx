"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Session boot moment — desktop + mobile, main shell hidden until acknowledged.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { partnersActiveCount } from "@/lib/partnerStatus";
import { CPG_ASSET, CPG_PRICING, formatUsd } from "@/lib/cpgLandCaseStudy";
import {
  INSTITUTIONAL_SHELL_BG,
  INSTITUTIONAL_PRIMARY_BTN_BG,
  INSTITUTIONAL_PRIMARY_BTN_TEXT,
} from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const STORAGE_KEY = "abraxas_boot_entered_v7";

const BOOT_STATS = [
  { value: "$2.7M+", label: "Attested on-registry", accentVar: "var(--accent)" },
  { value: "2", label: "Live assets · Cielo + land", accentVar: "var(--accent-2)" },
  { value: "USDC", label: "Settle on Sui today", accentVar: "var(--accent)" },
] as const;

export function AbraxasBootScreen({ onReady }: { onReady?: (ready: boolean) => void }) {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
    onReady?.(true);
  }, [onReady]);

  useEffect(() => {
    let skip = false;
    try {
      skip = Boolean(sessionStorage.getItem(STORAGE_KEY));
    } catch { /* ignore */ }
    if (skip) {
      onReady?.(true);
      setVisible(false);
    } else {
      setVisible(true);
      onReady?.(false);
    }
    setChecked(true);
  }, [onReady]);

  if (!checked) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--bg, #04050A)",
      }} aria-hidden />
    );
  }

  const partnerCount = partnersActiveCount();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          data-theme="dark"
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: INSTITUTIONAL_SHELL_BG,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: `
              radial-gradient(ellipse 50% 40% at 50% 38%, rgba(232,197,71,0.12) 0%, transparent 65%),
              radial-gradient(ellipse 45% 35% at 80% 70%, rgba(167,139,250,0.1) 0%, transparent 60%)
            `,
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: -6 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 1.5rem", maxWidth: 560, width: "100%" }}
          >
            <div className="abx-eyebrow-violet" style={{ marginBottom: "1rem" }}>
              Reusable trust · real assets
            </div>

            <div style={{
              fontFamily: FONT,
              fontSize: "clamp(2rem, 7vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 0.95,
              color: "var(--text-primary)",
              marginBottom: "0.65rem",
            }}>
              Stop proving<br />
              <span className="abx-gradient-text">the same asset twice.</span>
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(0.88rem, 2.4vw, 1rem)",
              fontWeight: 600,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              margin: "0 0 1.75rem",
              maxWidth: 420,
              marginLeft: "auto",
              marginRight: "auto",
            }}>
              Verify once. Every partner gets the same answer — no more re-forwarding plats and IDs.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "0.55rem",
              marginBottom: "1.35rem",
            }}>
              {BOOT_STATS.map(stat => (
                <div key={stat.label} className="abx-glass-panel" style={{
                  padding: "0.85rem 0.5rem",
                  borderRadius: 14,
                }}>
                  <div style={{
                    fontFamily: FONT,
                    fontSize: "clamp(1.1rem, 3.5vw, 1.35rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    color: stat.accentVar,
                    lineHeight: 1,
                    marginBottom: "0.35rem",
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: FONT,
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    lineHeight: 1.35,
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 500,
              color: "var(--text-muted)",
              lineHeight: 1.55,
              margin: "0 0 1.5rem",
            }}>
              Cielo Sunrise · live STR · USDC on Sui
              <span style={{ opacity: 0.45, margin: "0 0.35rem" }}>·</span>
              {CPG_ASSET.name} · {formatUsd(CPG_PRICING.fullProject)}
              <span style={{ opacity: 0.45, margin: "0 0.35rem" }}>·</span>
              {partnerCount} partners onboarded
            </p>

            <button
              type="button"
              onClick={dismiss}
              style={{
                padding: "0.85rem 2rem",
                borderRadius: 999,
                border: "none",
                background: INSTITUTIONAL_PRIMARY_BTN_BG,
                color: INSTITUTIONAL_PRIMARY_BTN_TEXT,
                fontFamily: FONT,
                fontSize: "0.82rem",
                fontWeight: 800,
                letterSpacing: "0.02em",
                cursor: "pointer",
                marginBottom: "1.1rem",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              Enter Abraxas →
            </button>

            <p style={{
              fontFamily: FONT,
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              letterSpacing: "0.03em",
              margin: 0,
              lineHeight: 1.55,
            }}>
              Browse the registry free · Passport unlocks full diligence packs
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
