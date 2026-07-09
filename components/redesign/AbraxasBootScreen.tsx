"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// First-visit brand moment — deliberate tap, then localStorage bypass on return.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const STORAGE_KEY = "abraxas_boot_entered_v5";

export function AbraxasBootScreen() {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { /* ignore */ }
    setVisible(true);
  }, []);

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
            style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 2rem", maxWidth: 480 }}
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
              margin: "0 0 1.75rem",
            }}>
              Verification infrastructure for permissioned on-chain finance.
            </p>

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
            }}>
              Public registry available without sign-in
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
