"use client";
// FILE: components/redesign/AbraxasBootScreen.tsx
// Lightweight first-visit flash — matches billboard hero, skippable immediately.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const SESSION_KEY = "abraxas_boot_v4";

export function AbraxasBootScreen() {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* ignore */ }
    setVisible(true);
    const timer = setTimeout(dismiss, 1400);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={dismiss}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") dismiss(); }}
          aria-label="Enter Abraxas"
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "var(--bg, #06090B)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(16,185,129,0.14) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 2rem" }}
          >
            <Image
              src="/icon-48.png"
              alt=""
              width={52}
              height={52}
              priority
              style={{ display: "block", margin: "0 auto 1rem", borderRadius: 12, boxShadow: `0 0 32px ${ACCENT}33` }}
            />

            <div style={{
              fontFamily: FONT,
              fontSize: "clamp(1.35rem, 4.5vw, 2rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "var(--text-primary, #F2F6F3)",
              marginBottom: "0.5rem",
            }}>
              Verify once.
              <br />
              <span style={{ color: ACCENT }}>Transact everywhere.</span>
            </div>

            <div style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              color: "var(--text-muted, rgba(242,246,243,0.45))",
              letterSpacing: "0.06em",
            }}>
              Tap to enter
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
