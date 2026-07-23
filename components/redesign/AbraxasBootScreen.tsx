"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Session boot. routes to deck (product) or article (thesis). No duplicated data.

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  INSTITUTIONAL_SHELL_BG,
  INSTITUTIONAL_PRIMARY_BTN_BG,
  INSTITUTIONAL_PRIMARY_BTN_TEXT,
  TEXT_ON_DARK,
} from "@/lib/design/institutionalTheme";

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const STORAGE_KEY = "abraxas_boot_entered_v10";

const BOOT_THEME: CSSProperties = {
  ["--text-primary" as string]: TEXT_ON_DARK.primary,
  ["--text-secondary" as string]: TEXT_ON_DARK.secondary,
  ["--text-muted" as string]: TEXT_ON_DARK.caption,
  ["--accent" as string]: "#E8C547",
  ["--accent-2" as string]: TEXT_ON_DARK.violet,
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
              radial-gradient(ellipse 50% 40% at 50% 38%, rgba(34,211,238,0.1) 0%, transparent 65%),
              radial-gradient(ellipse 45% 35% at 80% 70%, rgba(167,139,250,0.1) 0%, transparent 60%)
            `,
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: -6 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 1.5rem", maxWidth: 540, width: "100%" }}
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
              Abraxas · World Labs Protocol
            </div>

            <div style={{
              fontFamily: FONT,
              fontSize: "clamp(1.65rem, 6vw, 2.5rem)",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 1.08,
              marginBottom: "0.75rem",
            }}>
              <span style={{ color: TEXT_ON_DARK.primary, display: "block" }}>Connect wallet.</span>
              <span style={{ color: TEXT_ON_DARK.gold }}>See proof in 10 seconds.</span>
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(0.88rem, 2.2vw, 1rem)",
              fontWeight: 500,
              color: TEXT_ON_DARK.secondary,
              lineHeight: 1.55,
              margin: "0 0 1.75rem",
              maxWidth: 420,
              marginLeft: "auto",
              marginRight: "auto",
            }}>
              Minimum proof up front. Pick a path. arrow through product, thesis, build, and pulse.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
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
                  cursor: "pointer",
                  boxShadow: "0 0 0 1px rgba(232,197,71,0.35), 0 8px 32px rgba(232,197,71,0.18)",
                }}
              >
                Enter Abraxas →
              </button>

            <p style={{
              fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
              fontSize: "0.58rem",
              fontWeight: 600,
              color: TEXT_ON_DARK.caption,
              margin: 0,
              letterSpacing: "0.06em",
            }}>
              Wallet → proof → pick your path · Blog in Pulse chapter
            </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
