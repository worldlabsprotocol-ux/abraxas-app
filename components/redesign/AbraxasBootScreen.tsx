"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Cinematic first-visit intro for /terminal. Once per session, skippable.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const SESSION_KEY = "abraxas_boot_v2";

const LINES = [
  "Verification infrastructure",
  "Real-world asset attestation",
  "One credential. Every protocol.",
];

export function AbraxasBootScreen() {
  const [visible, setVisible] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* ignore */ }
    setVisible(true);
    const skipTimer = setTimeout(() => setCanSkip(true), 800);
    const lineTimer = setInterval(() => {
      setLineIdx(i => {
        const next = i + 1;
        if (next >= LINES.length) {
          clearInterval(lineTimer);
          setTimeout(dismiss, 500);
        }
        return Math.min(next, LINES.length - 1);
      });
    }, 700);
    return () => { clearInterval(lineTimer); clearTimeout(skipTimer); };
  }, [dismiss]);

  function handleSkip() {
    if (!canSkip) return;
    dismiss();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          onClick={handleSkip}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "var(--bg, #06090B)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: canSkip ? "pointer" : "default",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 50% 40% at 50% 55%, rgba(16,185,129,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 2rem" }}
          >
            <svg width={48} height={48} viewBox="0 0 40 40" fill="none" style={{ marginBottom: "1.5rem" }}>
              <polygon points="20,2 38,20 20,38 2,20" stroke={ACCENT} strokeWidth="2" fill="none" />
              <polygon points="20,8 32,20 20,32 8,20" stroke={ACCENT} strokeWidth="1.5" fill={`${ACCENT}22`} />
              <circle cx="20" cy="20" r="3" fill={ACCENT} />
            </svg>

            <div style={{
              fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: ACCENT, marginBottom: "1rem",
            }}>
              Abraxas Protocol
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={lineIdx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                style={{
                  fontFamily: FONT,
                  fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary, #F2F6F3)",
                  minHeight: "2.5rem",
                }}
              >
                {LINES[lineIdx]}
              </motion.div>
            </AnimatePresence>

            {canSkip && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: "2.5rem",
                  fontFamily: FONT, fontSize: "0.68rem",
                  color: "var(--text-muted, rgba(242,246,243,0.35))",
                  letterSpacing: "0.08em",
                }}
              >
                Tap to enter
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
