"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { RWA_STACK_LAYERS } from "@/lib/infrastructurePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [6000, 6000, 5000];

const actTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.5, ease: actEase },
};

export function StackLayerCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const layers = [...RWA_STACK_LAYERS].reverse();
  const visibleCount =
    act === 1
      ? Math.min(2, 1 + Math.floor(actProgress * 2))
      : act === 2
        ? 3
        : layers.length;

  const actLabel =
    act === 1 ? "Applications" : act === 2 ? "Issuance" : "Trust layer";

  const actCaption =
    act === 1
      ? "Users discover tokenized assets across many apps and chains."
      : act === 2
        ? "Issuers structure and mint — but each app still rebuilds trust."
        : "Abraxas sits underneath: verify once, reuse everywhere.";

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={actLabel}
      actCaption={actCaption}
      elapsed={elapsed}
      totalMs={totalMs}
      reducedMotion={reducedMotion}
      mood={act === 3 ? "gold" : "violet"}
      compact={compact}
      minHeight={compact ? 240 : 300}
    >
      <AnimatePresence mode="wait">
        <motion.div key={act} {...actTransition} className="flex h-full flex-col justify-center gap-2">
          {layers.slice(0, visibleCount).map((layer, i) => (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.45 }}
              style={{
                padding: "0.75rem 0.9rem",
                borderRadius: 12,
                border: layer.highlight
                  ? "1px solid rgba(232,197,71,0.5)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: layer.highlight
                  ? "linear-gradient(90deg, rgba(232,197,71,0.14), rgba(10,8,20,0.5))"
                  : "rgba(255,255,255,0.03)",
                boxShadow: layer.highlight ? "0 0 24px rgba(232,197,71,0.12)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{
                  fontFamily: FONT,
                  fontSize: layer.highlight ? "0.88rem" : "0.78rem",
                  fontWeight: layer.highlight ? 800 : 700,
                  color: layer.highlight ? "var(--accent-pale, #F5E6A8)" : "#FAFAFA",
                }}>
                  {layer.label}
                </div>
                {layer.highlight && (
                  <span style={{
                    fontFamily: MONO, fontSize: "0.42rem", fontWeight: 700,
                    letterSpacing: "0.08em", color: "var(--accent)",
                    padding: "0.15rem 0.45rem", borderRadius: 999,
                    border: "1px solid rgba(232,197,71,0.35)",
                  }}>
                    ABRAXAS
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: MONO, fontSize: "0.48rem",
                color: layer.highlight ? "rgba(245,230,168,0.8)" : "rgba(255,255,255,0.45)",
                marginTop: 4,
              }}>
                {layer.examples}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
