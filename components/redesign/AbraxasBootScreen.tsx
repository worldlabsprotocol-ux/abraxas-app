"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Welcome gate — informative, no wallet required. One click into the product.

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  INSTITUTIONAL_SHELL_BG,
  INSTITUTIONAL_PRIMARY_BTN_BG,
  INSTITUTIONAL_PRIMARY_BTN_TEXT,
  TEXT_ON_DARK,
} from "@/lib/design/institutionalTheme";
import { ABRAXAS_MECHANISM, ABRAXAS_ONE_LINER } from "@/lib/northStar";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
const STORAGE_KEY = "abraxas_boot_entered_v11";

const BOOT_THEME: CSSProperties = {
  ["--text-primary" as string]: TEXT_ON_DARK.primary,
  ["--text-secondary" as string]: TEXT_ON_DARK.secondary,
  ["--text-muted" as string]: TEXT_ON_DARK.caption,
  ["--accent" as string]: "#E8C547",
  ["--accent-2" as string]: TEXT_ON_DARK.violet,
};

const INSIDE = [
  "Live registry — Cielo Sunrise, Chickasaw, Good Trouble",
  "What RWA tokenization is — plain-language primer",
  "Verify layer — how proof travels without repeating diligence",
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
              radial-gradient(ellipse 50% 40% at 50% 38%, rgba(34,211,238,0.08) 0%, transparent 65%),
              radial-gradient(ellipse 45% 35% at 80% 70%, rgba(167,139,250,0.08) 0%, transparent 60%)
            `,
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: -6 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative", zIndex: 1, textAlign: "center",
              padding: "0 1.5rem", maxWidth: 520, width: "100%",
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: TEXT_ON_DARK.eyebrow,
              marginBottom: "0.85rem",
            }}>
              Abraxas · World Labs Protocol
            </div>

            <div style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(1.55rem, 5.5vw, 2.35rem)",
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 1.1,
              marginBottom: "0.65rem",
              color: TEXT_ON_DARK.primary,
            }}>
              {ABRAXAS_MECHANISM}
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(0.9rem, 2.2vw, 1.02rem)",
              fontWeight: 500,
              color: TEXT_ON_DARK.secondary,
              lineHeight: 1.6,
              margin: "0 0 1.25rem",
            }}>
              {ABRAXAS_ONE_LINER} Browse everything below — no wallet or account needed to explore.
            </p>

            <ul style={{
              listStyle: "none", margin: "0 0 1.5rem", padding: 0,
              display: "flex", flexDirection: "column", gap: "0.45rem",
              textAlign: "left", maxWidth: 400, marginLeft: "auto", marginRight: "auto",
            }}>
              {INSIDE.map(line => (
                <li
                  key={line}
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.76rem",
                    color: TEXT_ON_DARK.caption,
                    lineHeight: 1.5,
                    paddingLeft: "1rem",
                    position: "relative",
                  }}
                >
                  <span style={{
                    position: "absolute", left: 0, top: "0.45em",
                    width: 5, height: 5, borderRadius: 999,
                    background: "var(--accent)",
                  }} />
                  {line}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={dismiss}
              style={{
                padding: "0.85rem 2.1rem",
                borderRadius: 999,
                border: "none",
                background: INSTITUTIONAL_PRIMARY_BTN_BG,
                color: INSTITUTIONAL_PRIMARY_BTN_TEXT,
                fontFamily: FONT,
                fontSize: "0.84rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 0 1px rgba(232,197,71,0.35), 0 8px 32px rgba(232,197,71,0.18)",
              }}
            >
              Enter Abraxas →
            </button>

            <p style={{
              fontFamily: FONT,
              fontSize: "0.65rem",
              fontWeight: 500,
              color: TEXT_ON_DARK.caption,
              margin: "0.85rem 0 0",
              lineHeight: 1.5,
            }}>
              Connect a wallet later only if you want Passport or on-chain proof.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
