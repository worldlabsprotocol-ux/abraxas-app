"use client";
// FILE: components/home/HomeCinematicDemo.tsx
// 24s KYC chaos → Passport merge → Land/RWA unlock (keynote product story).

import { useEffect, useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import {
  ABRAXAS_INFRA_EMOTION,
  ABRAXAS_INFRA_MECHANISM,
  CINEMATIC_PHASE_MS,
  CINEMATIC_LOOP_MS,
  CINEMATIC_MERGE_LINE,
  CINEMATIC_HOLD_LINE,
} from "@/lib/infrastructurePositioning";
import { INSTITUTIONAL_GOLD, INSTITUTIONAL_GOLD_PALE } from "@/lib/design/institutionalTheme";
import {
  KycPassportDoc,
  KycDriverLicenseDoc,
  KycSsnFormDoc,
  KycVerifyModalDoc,
  AbraxasPassportVc,
  LandDeedDoc,
  RwaAssetDoc,
  ConnectionBeam,
} from "./cinematic/KycDocumentCards";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const SPRING: Transition = { type: "spring", stiffness: 120, damping: 14, mass: 0.9 };
const SPRING_FLOAT: Transition = { type: "spring", stiffness: 40, damping: 12 };
const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 200, damping: 18, mass: 0.75 };

const KYC_ITEMS = [
  { id: "passport", x: -105, y: -35, rot: -12, delay: 0, component: KycPassportDoc },
  { id: "license", x: 95, y: -45, rot: 8, delay: 0.08, component: KycDriverLicenseDoc },
  { id: "ssn", x: -55, y: 42, rot: -5, delay: 0.16, component: KycSsnFormDoc },
  { id: "modal1", x: 70, y: 28, rot: 6, delay: 0.22, component: () => <KycVerifyModalDoc repeat /> },
  { id: "modal2", x: -15, y: -58, rot: -3, delay: 0.28, component: () => <KycVerifyModalDoc /> },
  { id: "passport2", x: 115, y: -8, rot: 14, delay: 0.34, component: KycPassportDoc },
] as const;

function PhaseKycChaos() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 320, height: 200 }}>
        {KYC_ITEMS.map(item => {
          const Comp = item.component;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.75, x: item.x, y: item.y + 30, rotate: item.rot }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [item.x, item.x + 6, item.x - 4, item.x],
                y: [item.y, item.y - 8, item.y + 5, item.y],
                rotate: [item.rot, item.rot + 3, item.rot - 2, item.rot],
              }}
              transition={{
                opacity: { delay: item.delay, duration: 0.35 },
                scale: { ...SPRING_SNAPPY, delay: item.delay },
                x: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: item.delay },
                y: { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: item.delay + 0.2 },
                rotate: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: item.delay },
              }}
              style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
            >
              <Comp />
            </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0.7] }}
          transition={{ delay: 1.2, duration: 0.5 }}
          style={{
            position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
            fontFamily: MONO, fontSize: "0.48rem", letterSpacing: "0.1em",
            color: "rgba(248,113,113,0.85)", whiteSpace: "nowrap",
          }}
        >
          SAME KYC · OVER AND OVER
        </motion.div>
      </div>
    </div>
  );
}

function PhaseConsolidation() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Incoming KYC shrinking toward center */}
      {KYC_ITEMS.map((item, i) => (
        <motion.div
          key={`merge-${item.id}`}
          initial={{ opacity: 0.7, x: item.x, y: item.y, scale: 1, rotate: item.rot }}
          animate={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: 0 }}
          transition={{ ...SPRING, delay: i * 0.06, duration: 0.85 }}
          style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}
        >
          <item.component />
        </motion.div>
      ))}

      {/* Merge streaks */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.div
          key={`streak-${i}`}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: [0, 0.8, 0], scaleX: [0, 1, 1.2] }}
          transition={{ delay: 0.35 + i * 0.05, duration: 0.6 }}
          style={{
            position: "absolute",
            width: 80,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${INSTITUTIONAL_GOLD}, transparent)`,
            transform: `rotate(${i * 45}deg)`,
            transformOrigin: "center",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.5, filter: "blur(16px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ ...SPRING, delay: 0.55 }}
        style={{ position: "relative", zIndex: 5 }}
      >
        <AbraxasPassportVc pulse />
      </motion.div>

      <AnimatePresence>
        <motion.p
          key="merge-line"
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -8] }}
          transition={{ delay: 1.1, duration: 2.8, times: [0, 0.15, 0.75, 1] }}
          style={{
            position: "absolute",
            bottom: "18%",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: "clamp(0.82rem, 2.2vw, 1rem)",
            fontWeight: 700,
            fontStyle: "italic",
            letterSpacing: "-0.01em",
            color: INSTITUTIONAL_GOLD_PALE,
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
            padding: "0 1rem",
          }}
        >
          {CINEMATIC_MERGE_LINE}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function PhaseLandUnlock() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", flexWrap: "wrap", maxWidth: 420 }}>
        <motion.div
          initial={{ opacity: 0, x: -24, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          <AbraxasPassportVc pulse />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING_SNAPPY, delay: 0.45 }}
          style={{ display: "flex", alignItems: "center" }}
        >
          <ConnectionBeam />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24, scale: 0.88, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ ...SPRING, delay: 0.55 }}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <LandDeedDoc />
          <RwaAssetDoc />
        </motion.div>
      </div>

      {/* Stamp pulse on land cards */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0.6], scale: [0.5, 1.15, 1] }}
        transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
        style={{
          position: "absolute",
          right: "12%",
          top: "38%",
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "2px solid #10B981",
          background: "rgba(16,185,129,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          color: "#10B981",
          boxShadow: "0 0 20px rgba(16,185,129,0.4)",
        }}
      >
        ✓
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 1.4 }}
        style={{
          marginTop: "1.25rem",
          fontFamily: FONT,
          fontSize: "clamp(0.78rem, 2vw, 0.92rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#FAFAFA",
          textAlign: "center",
          maxWidth: 380,
        }}
      >
        {CINEMATIC_HOLD_LINE}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        style={{
          marginTop: "0.45rem",
          fontFamily: MONO,
          fontSize: "0.46rem",
          letterSpacing: "0.1em",
          color: "rgba(16,185,129,0.75)",
        }}
      >
        PORTABLE · LAND · RWAs · ANY APP
      </motion.div>
    </div>
  );
}

export function HomeCinematicDemo() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phaseElapsed, setPhaseElapsed] = useState(0);

  const phaseOffsets = [0, CINEMATIC_PHASE_MS[0], CINEMATIC_PHASE_MS[0] + CINEMATIC_PHASE_MS[1]];

  const advance = useCallback(() => {
    setPhase(p => (p + 1) % 3);
  }, []);

  useEffect(() => {
    if (paused || reduce) return;
    const t = setTimeout(advance, CINEMATIC_PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase, paused, reduce, advance]);

  useEffect(() => {
    if (paused) return;
    const start = Date.now();
    setPhaseElapsed(0);
    const id = setInterval(() => setPhaseElapsed(Date.now() - start), 40);
    return () => clearInterval(id);
  }, [phase, paused]);

  const totalElapsed = phaseOffsets[phase] + Math.min(phaseElapsed, CINEMATIC_PHASE_MS[phase]);
  const progress = Math.min(100, (totalElapsed / CINEMATIC_LOOP_MS) * 100);
  const loopSec = Math.round(CINEMATIC_LOOP_MS / 1000);

  const phaseLabels = ["Repeated KYC", "One Passport", "Land & RWAs unlock"];

  return (
    <section
      id="demo"
      aria-label="Abraxas product story"
      style={{
        padding: "clamp(0.5rem, 2vw, 1rem) 0 clamp(1.25rem, 3vw, 2rem)",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-glass-panel"
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "linear-gradient(180deg, rgba(10,8,20,0.5) 0%, #030408 100%)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        {/* Hook copy inside the card */}
        <div style={{ padding: "clamp(1rem, 3vw, 1.35rem) clamp(1rem, 3vw, 1.35rem) 0.65rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
                Product story · ~{loopSec}s
              </div>
              <h2
                style={{
                  fontFamily: FONT,
                  fontSize: "clamp(1.15rem, 3.2vw, 1.5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.15,
                  color: "var(--text-primary)",
                  margin: "0 0 0.35rem",
                  maxWidth: 480,
                }}
              >
                {ABRAXAS_INFRA_EMOTION}
              </h2>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {ABRAXAS_INFRA_MECHANISM}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPaused(p => !p)}
              aria-pressed={paused}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: 999,
                border: "1px solid rgba(232,197,71,0.35)",
                background: "rgba(232,197,71,0.08)",
                fontFamily: FONT,
                fontSize: "0.68rem",
                fontWeight: 600,
                color: INSTITUTIONAL_GOLD_PALE,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {paused ? "Resume ▶" : "Pause ⏸"}
            </button>
          </div>
        </div>

        {/* Animation viewport — taller on desktop */}
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 10",
            minHeight: 220,
            maxHeight: 420,
            margin: "0 clamp(0.65rem, 2vw, 1rem) clamp(0.65rem, 2vw, 1rem)",
            borderRadius: 14,
            overflow: "hidden",
            background: "#030408",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `
                radial-gradient(ellipse 70% 50% at 50% 45%, rgba(232,197,71,0.07) 0%, transparent 60%),
                radial-gradient(ellipse 45% 35% at 85% 75%, rgba(167,139,250,0.05) 0%, transparent 55%),
                radial-gradient(circle at 20% 80%, rgba(248,113,113,0.04) 0%, transparent 40%)
              `,
              pointerEvents: "none",
            }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, filter: reduce ? "none" : "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: reduce ? "none" : "blur(6px)" }}
              transition={reduce ? { duration: 0.25 } : SPRING}
              style={{ position: "absolute", inset: 0 }}
            >
              {phase === 0 && <PhaseKycChaos />}
              {phase === 1 && <PhaseConsolidation />}
              {phase === 2 && <PhaseLandUnlock />}
            </motion.div>
          </AnimatePresence>

          {/* Continuous progress bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              style={{ height: "100%", background: INSTITUTIONAL_GOLD, width: `${progress}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        </div>

        {/* Phase dots */}
        <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", paddingBottom: "1rem", flexWrap: "wrap" }}>
          {phaseLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-current={i === phase ? "step" : undefined}
              onClick={() => { setPhase(i); setPaused(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.65rem",
                borderRadius: 999,
                border: i === phase ? "1px solid rgba(232,197,71,0.45)" : "1px solid var(--border)",
                background: i === phase ? "rgba(232,197,71,0.1)" : "transparent",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: i === phase ? INSTITUTIONAL_GOLD : "rgba(255,255,255,0.2)",
                }}
              />
              <span style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: i === phase ? 700 : 500, color: "var(--text-secondary)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
