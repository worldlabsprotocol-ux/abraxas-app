"use client";
// FILE: components/home/HomeCinematicDemo.tsx
// Cinematic product story — keynote motion, zero static dashboards.

import { useEffect, useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import {
  ABRAXAS_INFRA_EMOTION,
  CINEMATIC_UNLOCK_TARGETS,
} from "@/lib/infrastructurePositioning";
import { INSTITUTIONAL_GOLD, INSTITUTIONAL_GOLD_PALE, INSTITUTIONAL_VIOLET } from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const SPRING: Transition = { type: "spring", stiffness: 140, damping: 16, mass: 0.85 };
const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 220, damping: 18, mass: 0.7 };

const SCENE_MS = [4800, 4200, 5200, 4800, 4500] as const;
const TOTAL_MS = SCENE_MS.reduce((a, b) => a + b, 0);

function DocIcon({ x, y, delay, frozen }: { x: number; y: number; delay: number; frozen?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, x, y, rotate: -8 }}
      animate={{
        opacity: frozen ? 0.35 : [0, 1, 1],
        scale: frozen ? 0.85 : [0.6, 1.05, 1],
        x,
        y: frozen ? y : [y + 20, y - 4, y],
        rotate: frozen ? 0 : [-8, 2, 0],
      }}
      transition={{ ...SPRING, delay, duration: frozen ? 0.3 : undefined }}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 52,
        height: 66,
        marginLeft: -26,
        marginTop: -33,
        borderRadius: 8,
        border: "1px solid rgba(232,197,71,0.35)",
        background: "linear-gradient(145deg, rgba(30,30,36,0.95) 0%, rgba(12,12,16,0.98) 100%)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ height: 8, margin: "8px 8px 0", borderRadius: 2, background: "rgba(232,197,71,0.25)" }} />
      <div style={{ height: 3, margin: "6px 10px", borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
      <div style={{ height: 3, margin: "4px 10px", borderRadius: 2, background: "rgba(255,255,255,0.06)", width: "70%" }} />
    </motion.div>
  );
}

function PassportCard({ scale = 1, glow = false }: { scale?: number; glow?: boolean }) {
  return (
    <motion.div
      animate={{ scale }}
      transition={SPRING}
      style={{
        width: 200,
        height: 124,
        borderRadius: 16,
        border: `2px solid ${glow ? INSTITUTIONAL_GOLD : "rgba(232,197,71,0.5)"}`,
        background: "linear-gradient(155deg, #121018 0%, #06090B 100%)",
        boxShadow: glow
          ? `0 0 60px rgba(232,197,71,0.35), 0 24px 48px rgba(0,0,0,0.5)`
          : "0 20px 40px rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        position: "relative",
        zIndex: 2,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: "0.48rem", letterSpacing: "0.14em", color: INSTITUTIONAL_VIOLET }}>
        ABRAXAS
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: INSTITUTIONAL_GOLD_PALE }}>
        Passport
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: "rgba(255,255,255,0.5)" }}>
        Verified once ✓
      </div>
    </motion.div>
  );
}

function ScenePain() {
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFrozen(true), 2400);
    return () => clearTimeout(t);
  }, []);
  const docs = [
    { x: -90, y: -30, d: 0.1 },
    { x: 70, y: -50, d: 0.25 },
    { x: -40, y: 40, d: 0.4 },
    { x: 100, y: 20, d: 0.55 },
    { x: 0, y: -70, d: 0.7 },
    { x: -120, y: 10, d: 0.85 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <motion.p
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...SPRING, delay: 0.15 }}
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1rem, 2.8vw, 1.35rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#FAFAFA",
          textAlign: "center",
          maxWidth: 420,
          margin: "0 0 2rem",
          padding: "0 1rem",
          lineHeight: 1.2,
          zIndex: 3,
        }}
      >
        {ABRAXAS_INFRA_EMOTION}
      </motion.p>
      <div style={{ position: "relative", width: 280, height: 160 }}>
        {docs.map((doc, i) => (
          <DocIcon key={i} x={doc.x} y={doc.y} delay={doc.d} frozen={frozen} />
        ))}
        <AnimatePresence>
          {frozen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={SPRING_SNAPPY}
              style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 5 }}
            >
              <PassportCard glow />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SceneDedupe() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    angle: (i / 12) * Math.PI * 2,
    delay: i * 0.04,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: 800 }}>
      <motion.div
        initial={{ scale: 0.85, rotateX: 8 }}
        animate={{ scale: 1.12, rotateX: 0 }}
        transition={SPRING}
        style={{ transformStyle: "preserve-3d" }}
      >
        <PassportCard glow scale={1} />
      </motion.div>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0.6],
            scale: [0, 1.2, 1],
            x: Math.cos(p.angle) * 90,
            y: Math.sin(p.angle) * 70,
          }}
          transition={{ ...SPRING, delay: 0.2 + p.delay }}
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: INSTITUTIONAL_GOLD,
            boxShadow: `0 0 12px ${INSTITUTIONAL_GOLD}`,
          }}
        />
      ))}
    </div>
  );
}

function SceneUnlocks() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "0.65rem",
        padding: "clamp(1.5rem, 4vw, 2.5rem)",
        alignContent: "center",
        maxWidth: 480,
        margin: "0 auto",
        left: 0,
        right: 0,
      }}
    >
      {CINEMATIC_UNLOCK_TARGETS.map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0.25, scale: 0.92, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ ...SPRING_SNAPPY, delay: 0.15 + i * 0.12 }}
          style={{
            padding: "0.75rem 0.5rem",
            borderRadius: 12,
            textAlign: "center",
            border: "1px solid rgba(16,185,129,0.45)",
            background: "linear-gradient(145deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.06) 100%)",
            boxShadow: "0 0 24px rgba(16,185,129,0.15)",
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ ...SPRING_SNAPPY, delay: 0.2 + i * 0.12 }}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10B981",
              margin: "0 auto 0.4rem",
              boxShadow: "0 0 10px #10B981",
            }}
          />
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800, color: "#FAFAFA" }}>{label}</div>
          <div style={{ fontFamily: MONO, fontSize: "0.45rem", color: "rgba(16,185,129,0.85)", marginTop: 4 }}>
            UNLOCKED
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function SceneNetwork() {
  const nodes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = 38;
    return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r, i };
  });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING}
        style={{ width: "min(340px, 85vw)", aspectRatio: "1", position: "relative" }}
      >
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible" }} aria-hidden>
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
            {nodes.map((n, i) =>
              nodes.slice(i + 1).map((m, j) => (
                <line
                  key={`${i}-${j}`}
                  x1={n.x}
                  y1={n.y}
                  x2={m.x}
                  y2={m.y}
                  stroke="rgba(232,197,71,0.22)"
                  strokeWidth="0.35"
                />
              )),
            )}
          </motion.g>
          {nodes.map((n, i) => (
            <motion.circle
              key={i}
              cx={n.x}
              cy={n.y}
              r="2.5"
              fill={INSTITUTIONAL_GOLD}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.05 * i }}
            />
          ))}
        </svg>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.5 }}
          style={{
            position: "absolute",
            bottom: -8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: "0.52rem",
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          TRUST NETWORK GROWING
        </motion.p>
      </motion.div>
    </div>
  );
}

function ScenePayoff() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.88, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={SPRING}
        style={{ textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.75rem, 6vw, 3.25rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: INSTITUTIONAL_GOLD_PALE,
            marginBottom: "0.35rem",
          }}
        >
          VERIFY ONCE.
        </div>
        <div
          className="abx-gradient-text"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.75rem, 6vw, 3.25rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
          }}
        >
          TRANSACT EVERYWHERE.
        </div>
      </motion.div>
    </div>
  );
}

export function HomeCinematicDemo() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setScene(s => (s + 1) % 5);
  }, []);

  useEffect(() => {
    if (paused || reduce) return;
    const t = setTimeout(advance, SCENE_MS[scene]);
    return () => clearTimeout(t);
  }, [scene, paused, reduce, advance]);

  const progress = ((scene + 1) / 5) * 100;

  return (
    <section id="demo" aria-label="Abraxas product story" style={{ padding: "clamp(0.5rem, 2vw, 1rem) 0 clamp(1.25rem, 3vw, 2rem)", borderBottom: "1px solid var(--border-strong)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div className="abx-eyebrow-violet">Product story · ~{Math.round(TOTAL_MS / 1000)}s</div>
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
          }}
        >
          {paused ? "Resume ▶" : "Pause ⏸"}
        </button>
      </div>

      <div
        className="abx-glass-panel"
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "#030408",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse 70% 50% at 50% 40%, rgba(232,197,71,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 80% 80%, rgba(167,139,250,0.06) 0%, transparent 55%)
            `,
            pointerEvents: "none",
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, scale: 0.98, filter: reduce ? "none" : "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.02, filter: reduce ? "none" : "blur(8px)" }}
            transition={reduce ? { duration: 0.2 } : SPRING}
            style={{ position: "absolute", inset: 0 }}
          >
            {scene === 0 && <ScenePain />}
            {scene === 1 && <SceneDedupe />}
            {scene === 2 && <SceneUnlocks />}
            {scene === 3 && <SceneNetwork />}
            {scene === 4 && <ScenePayoff />}
          </motion.div>
        </AnimatePresence>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: "100%", background: INSTITUTIONAL_GOLD }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.65rem", justifyContent: "center" }}>
        {[0, 1, 2, 3, 4].map(i => (
          <button
            key={i}
            type="button"
            aria-label={`Scene ${i + 1}`}
            onClick={() => { setScene(i); setPaused(false); }}
            style={{
              width: i === scene ? 22 : 8,
              height: 8,
              borderRadius: 999,
              border: "none",
              background: i === scene ? INSTITUTIONAL_GOLD : "rgba(255,255,255,0.15)",
              cursor: "pointer",
              transition: "width 0.3s ease",
            }}
          />
        ))}
      </div>
    </section>
  );
}
