"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Welcome gate — concise intro, tap to enter.

import { useState, useCallback, useEffect } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  INSTITUTIONAL_SHELL_BG,
  INSTITUTIONAL_PRIMARY_BTN_BG,
  INSTITUTIONAL_PRIMARY_BTN_TEXT,
  TEXT_ON_DARK,
} from "@/lib/design/institutionalTheme";
import { ABRAXAS_MECHANISM } from "@/lib/northStar";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;
export const BOOT_DISMISSED_SESSION_KEY = "abraxas_boot_dismissed_session_v1";

const BOOT_THEME: CSSProperties = {
  ["--text-primary" as string]: TEXT_ON_DARK.primary,
  ["--text-secondary" as string]: TEXT_ON_DARK.secondary,
  ["--text-muted" as string]: TEXT_ON_DARK.caption,
  ["--accent" as string]: "#E8C547",
  ["--accent-2" as string]: TEXT_ON_DARK.violet,
};

function isBootDismissedForSession(): boolean {
  try {
    return sessionStorage.getItem(BOOT_DISMISSED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function AbraxasBootScreen({ onReady }: { onReady?: (ready: boolean) => void }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !isBootDismissedForSession();
  });

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(BOOT_DISMISSED_SESSION_KEY, "1");
    } catch {
      // sessionStorage may be unavailable in private mode
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) onReady?.(true);
  }, [visible, onReady]);

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
      initial: { scale: 0.98, opacity: 0, y: 8 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: 0.99, opacity: 0, y: -4 },
    };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.35 }}
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
            {...panelMotion}
            transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative", zIndex: 1, textAlign: "center",
              padding: "0 1.5rem", maxWidth: 420, width: "100%",
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: TEXT_ON_DARK.eyebrow,
              marginBottom: "0.75rem",
            }}>
              Abraxas Protocol
            </div>

            <div
              id="abraxas-boot-heading"
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(1.55rem, 5.5vw, 2.1rem)",
                fontWeight: 900,
                letterSpacing: "-0.045em",
                lineHeight: 1.1,
                marginBottom: "0.55rem",
                color: TEXT_ON_DARK.primary,
              }}
            >
              {ABRAXAS_MECHANISM}
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(0.86rem, 2.2vw, 0.95rem)",
              fontWeight: 500,
              color: TEXT_ON_DARK.secondary,
              lineHeight: 1.5,
              margin: "0 0 1.25rem",
            }}>
              Reusable verification for regulated apps. Browse public proofs. No wallet required to explore.
            </p>

            <button
              type="button"
              onClick={dismiss}
              style={{
                padding: "0.8rem 2rem",
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
              Enter Abraxas
            </button>

            <button
              type="button"
              onClick={dismiss}
              style={{
                display: "block",
                margin: "0.75rem auto 0",
                padding: "0.35rem 0.5rem",
                border: "none",
                background: "transparent",
                color: TEXT_ON_DARK.caption,
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "0.2em",
              }}
            >
              Skip intro
            </button>

            <p style={{
              fontFamily: FONT,
              fontSize: "0.62rem",
              fontWeight: 500,
              color: TEXT_ON_DARK.caption,
              margin: "0.75rem 0 0",
              lineHeight: 1.45,
            }}>
              Connect a wallet when you want Passport or on-chain proof.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
