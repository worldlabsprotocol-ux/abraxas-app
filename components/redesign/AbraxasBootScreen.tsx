"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Session boot moment — desktop + mobile, main shell hidden until acknowledged.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { partnersActiveCount } from "@/lib/partnerStatus";
import { CPG_PRICING, formatUsd } from "@/lib/cpgLandCaseStudy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const STORAGE_KEY = "abraxas_boot_entered_v6";

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
        background: "var(--bg, #06090B)",
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
          transition={{ duration: 0.4 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "var(--bg, #06090B)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(16,185,129,0.14) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 2rem", maxWidth: 520 }}
          >
            <div style={{
              fontFamily: FONT,
              fontSize: "clamp(1.5rem, 5vw, 2.25rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: ACCENT,
              marginBottom: "0.85rem",
            }}>
              ABRAXAS
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(0.82rem, 2.2vw, 0.95rem)",
              color: "var(--text-secondary, rgba(242,246,243,0.72))",
              lineHeight: 1.65,
              margin: "0 0 1.25rem",
            }}>
              Closed-loop reusable trust for real assets. Prove once — never re-forward the same documents.
            </p>

            <ul style={{
              listStyle: "none", padding: 0, margin: "0 0 1.5rem",
              textAlign: "left", display: "grid", gap: "0.55rem",
            }}>
              {[
                `Cielo Sunrise · $1.1M appraised · live STR · USDC on Sui`,
                `Grady County 270 · ${formatUsd(CPG_PRICING.fullProject)} · active land partner`,
                `$2.7M+ attested registry · ${partnerCount} partners onboarded`,
                `Partner updates sync here — buyers stay on Abraxas`,
              ].map(line => (
                <li key={line} style={{
                  fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-primary)",
                  padding: "0.45rem 0.65rem", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--surface)",
                  lineHeight: 1.45,
                }}>
                  {line}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={dismiss}
              style={{
                padding: "0.75rem 1.75rem",
                borderRadius: 999,
                border: `1.5px solid ${ACCENT}`,
                background: "transparent",
                color: ACCENT,
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                marginBottom: "1.25rem",
              }}
            >
              Enter the Protocol
            </button>

            <p style={{
              fontFamily: FONT,
              fontSize: "0.68rem",
              color: "var(--text-muted, rgba(242,246,243,0.45))",
              letterSpacing: "0.04em",
              margin: 0,
              lineHeight: 1.55,
            }}>
              Registry browsable without sign-in · Passport unlocks full diligence packs
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
