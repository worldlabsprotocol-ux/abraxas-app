"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Welcome gate — once per browser session, then straight to content.

import { useState, useCallback, useEffect } from "react";
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
const BOOT_SEEN_KEY = "abraxas_boot_seen_v1";

const BOOT_THEME: CSSProperties = {
  ["--text-primary" as string]: TEXT_ON_DARK.primary,
  ["--text-secondary" as string]: TEXT_ON_DARK.secondary,
  ["--text-muted" as string]: TEXT_ON_DARK.caption,
  ["--accent" as string]: "#E8C547",
  ["--accent-2" as string]: TEXT_ON_DARK.violet,
};

const INSIDE = [
  "Live registry: Cielo Sunrise, Chickasaw, Good Trouble",
  "Verification pipeline and reusable credentials",
  "Integrate without rebuilding identity flows",
] as const;

export function AbraxasBootScreen({ onReady }: { onReady?: (ready: boolean) => void }) {
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && sessionStorage.getItem(BOOT_SEEN_KEY) === "1";
    if (seen) {
      onReady?.(true);
    } else {
      setVisible(true);
    }
    setHydrated(true);
  }, [onReady]);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {
      /* private browsing */
    }
    setVisible(false);
    onReady?.(true);
  }, [onReady]);

  if (!hydrated) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
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
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.99, opacity: 0, y: -4 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative", zIndex: 1, textAlign: "center",
              padding: "0 1.5rem", maxWidth: 480, width: "100%",
            }}
          >
            <p className="abx-section-label" style={{ marginBottom: "0.85rem", color: TEXT_ON_DARK.caption }}>
              Abraxas · World Labs Protocol
            </p>

            <div style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(1.55rem, 5.5vw, 2.2rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.12,
              marginBottom: "0.65rem",
              color: TEXT_ON_DARK.primary,
            }}>
              {ABRAXAS_MECHANISM}
            </div>

            <p style={{
              fontFamily: FONT,
              fontSize: "clamp(0.9rem, 2.2vw, 1rem)",
              fontWeight: 500,
              color: TEXT_ON_DARK.secondary,
              lineHeight: 1.6,
              margin: "0 0 1.25rem",
            }}>
              {ABRAXAS_ONE_LINER}
            </p>

            <ul style={{
              listStyle: "none", margin: "0 0 1.35rem", padding: 0,
              display: "flex", flexDirection: "column", gap: "0.4rem",
              textAlign: "left", maxWidth: 380, marginLeft: "auto", marginRight: "auto",
            }}>
              {INSIDE.map(line => (
                <li
                  key={line}
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.76rem",
                    color: TEXT_ON_DARK.caption,
                    lineHeight: 1.5,
                    paddingLeft: "0.85rem",
                    borderLeft: "2px solid rgba(232, 197, 71, 0.35)",
                  }}
                >
                  {line}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={dismiss}
              style={{
                padding: "0.8rem 1.85rem",
                borderRadius: 10,
                border: "none",
                background: INSTITUTIONAL_PRIMARY_BTN_BG,
                color: INSTITUTIONAL_PRIMARY_BTN_TEXT,
                fontFamily: FONT,
                fontSize: "0.84rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
