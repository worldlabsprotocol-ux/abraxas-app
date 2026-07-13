"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Session boot moment — desktop + mobile, main shell hidden until acknowledged.

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { partnersActiveCount } from "@/lib/partnerStatus";
import { CPG_ASSET, CPG_PRICING, formatUsd } from "@/lib/cpgLandCaseStudy";
import {
  INSTITUTIONAL_SHELL_BG,
  INSTITUTIONAL_PRIMARY_BTN_BG,
  INSTITUTIONAL_PRIMARY_BTN_TEXT,
  TEXT_ON_DARK,
} from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const STORAGE_KEY = "abraxas_boot_entered_v7";

const BOOT_STATS = [
  { value: "$2.7M+", label: "Attested on-registry", accent: TEXT_ON_DARK.gold },
  { value: "2", label: "Live assets · Cielo + land", accent: TEXT_ON_DARK.violet },
  { value: "USDC", label: "Settle on Sui today", accent: TEXT_ON_DARK.gold },
] as const;

/** Force dark tokens on boot overlay — html may still be light theme until user enters app */
const BOOT_THEME: CSSProperties = {
  ["--text-primary" as string]: TEXT_ON_DARK.primary,
  ["--text-secondary" as string]: TEXT_ON_DARK.secondary,
  ["--text-muted" as string]: TEXT_ON_DARK.caption,
  ["--accent" as string]: "#E8C547",
  ["--accent-2" as string]: TEXT_ON_DARK.violet,
  ["--accent-pale" as string]: TEXT_ON_DARK.gold,
  ["--shadow-glow" as string]: "0 0 0 1px rgba(232,197,71,0.35), 0 8px 32px rgba(232,197,71,0.18)",
};

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
        background: "#04050A",
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
            ...BOOT_THEME,
            position: "fixed", inset: 0, zIndex: 9999,
            background: INSTITUTIONAL_SHELL_BG,
            color: TEXT_ON_DARK.primary,
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
            <div style={{
              fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: TEXT_ON_DARK.eyebrow,
              marginBottom: "1rem",
            }}>
              Reusable trust · real assets
            </div>

            <div style={{
              fontFamily: FONT,
              fontSize: "clamp(2rem, 7vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 1.05,
              marginBottom: "0.65rem",
            }}>
              <span style={{ color: TEXT_ON_DARK.primary, display: "block" }}>Stop proving</span>
              <span style={{ color: TEXT_ON_DARK.gold }}>the same asset </span>
              <span style={{ color: TEXT_ON_DARK.violet }}>twice.</span>
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(0.88rem, 2.4vw, 1rem)",
              fontWeight: 500,
              color: TEXT_ON_DARK.secondary,
              lineHeight: 1.55,
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
                    color: stat.accent,
                    lineHeight: 1,
                    marginBottom: "0.35rem",
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: FONT,
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    color: TEXT_ON_DARK.secondary,
                    lineHeight: 1.4,
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: TEXT_ON_DARK.caption,
              lineHeight: 1.55,
              margin: "0 0 1.5rem",
            }}>
              Cielo Sunrise · live STR · USDC on Sui
              <span style={{ color: TEXT_ON_DARK.secondary, margin: "0 0.35rem" }}> · </span>
              {CPG_ASSET.name} · {formatUsd(CPG_PRICING.fullProject)}
              <span style={{ color: TEXT_ON_DARK.secondary, margin: "0 0.35rem" }}> · </span>
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
                boxShadow: "0 0 0 1px rgba(232,197,71,0.35), 0 8px 32px rgba(232,197,71,0.18)",
              }}
            >
              Enter Abraxas →
            </button>

            <p style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 500,
              color: TEXT_ON_DARK.caption,
              letterSpacing: "0.02em",
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
