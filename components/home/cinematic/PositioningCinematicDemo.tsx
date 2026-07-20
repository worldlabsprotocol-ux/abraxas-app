"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import {
  PremiumGlassCard,
  PremiumStat,
  SplitCompare,
} from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT, CONCEPT_TYPE } from "@/components/home/cinematic/demoPremium";

const ACT_MS = [5500, 5500, 5500];

export function PositioningCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount, actProgress } = useCinematicTimer(ACT_MS);

  const captions = [
    "Position before the chain — not after the premium.",
    "Registry-ready record. Monitoring on. Partners can see status now.",
    "Collateral, sale, or tokenize — credentials travel with you.",
  ];
  const labels = ["Act now", "Registry", "Options"];

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="market"
      compact={compact}
      minHeight={compact ? 220 : 280}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="p1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: actEase }}
            className="flex flex-col items-center gap-6"
          >
            <SplitCompare
              accent={ACCENT.rose}
              leftLabel="Legacy"
              rightLabel="Abraxas"
              left={
                <PremiumGlassCard style={{ opacity: 0.6, padding: "14px 16px" }}>
                  <div style={{ fontSize: CONCEPT_TYPE.body, fontWeight: 800, color: "rgba(255,255,255,0.5)" }}>Tokenize quietly</div>
                  <div style={{ fontSize: CONCEPT_TYPE.mono, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Pay premium later</div>
                </PremiumGlassCard>
              }
              right={
                <PremiumGlassCard accent={ACCENT.rose} glow style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: CONCEPT_TYPE.body, fontWeight: 800, color: "#FAFAFA" }}>Proof-first</div>
                  <div style={{ fontSize: CONCEPT_TYPE.mono, color: ACCENT.rose, marginTop: 6 }}>Act before the window closes</div>
                </PremiumGlassCard>
              }
            />
            <PremiumStat value={`${Math.min(3, 1 + Math.floor(actProgress * 3))}/3`} label="Positioning steps" accent={ACCENT.rose} />
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="p2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <PremiumGlassCard accent={ACCENT.rose} glow style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
              <div style={{ fontSize: CONCEPT_TYPE.label, letterSpacing: "0.14em", color: ACCENT.rose, fontWeight: 700, marginBottom: 8 }}>ABX RECORD LIVE</div>
              <div style={{ fontSize: CONCEPT_TYPE.hero, fontWeight: 900, color: "#FAFAFA", letterSpacing: "-0.03em" }}>Registry-ready</div>
              <div style={{ fontSize: CONCEPT_TYPE.sub, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>Monitoring · public verify path · partner-visible</div>
            </PremiumGlassCard>
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="p3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid w-full max-w-md grid-cols-3 gap-3 mx-auto"
          >
            {["Collateral", "Sale", "Tokenize"].map((path, i) => (
              <motion.div
                key={path}
                animate={{ opacity: actProgress > i * 0.2 ? 1 : 0.35, y: actProgress > i * 0.2 ? 0 : 8 }}
              >
                <PremiumStat value="→" label={path} accent={ACCENT.rose} pulse={actProgress > i * 0.2 && actProgress < i * 0.2 + 0.35} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
