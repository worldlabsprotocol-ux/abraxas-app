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
import {
  RWA_INSTITUTION_QUESTIONS,
  RWA_THESIS_ACTS,
  RWA_THESIS_MARKET_STATS,
  RWA_TOKENIZATION_STEPS,
} from "@/lib/rwaTokenizationThesis";

const ACT_MS = [6500, 7000, 6500, 6500];
const LABELS = ["Market", "Tokenize", "The gap", "Abraxas"];

export function RwaThesisCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount, actProgress } = useCinematicTimer(ACT_MS);

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={LABELS[act - 1] ?? ""}
      actCaption={RWA_THESIS_ACTS[act - 1] ?? ""}
      variant="market"
      compact={compact}
      minHeight={compact ? 240 : 300}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div
            key="rwa1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: actEase }}
            className="grid w-full max-w-lg grid-cols-3 gap-2 mx-auto"
          >
            {RWA_THESIS_MARKET_STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                animate={{ opacity: actProgress > i * 0.15 ? 1 : 0.3, y: actProgress > i * 0.15 ? 0 : 10 }}
              >
                <PremiumGlassCard accent={ACCENT.gold} style={{ padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: CONCEPT_TYPE.mono, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: CONCEPT_TYPE.body, fontWeight: 900, color: "#FAFAFA" }}>{stat.value}</div>
                </PremiumGlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {act === 2 && (
          <motion.div
            key="rwa2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 w-full max-w-md mx-auto"
          >
            {RWA_TOKENIZATION_STEPS.slice(0, 4).map((s, i) => (
              <motion.div
                key={s.step}
                animate={{
                  opacity: actProgress > i * 0.18 ? 1 : 0.25,
                  x: actProgress > i * 0.18 ? 0 : -12,
                }}
              >
                <PremiumGlassCard accent={ACCENT.gold} style={{ padding: "8px 12px" }}>
                  <div style={{ display: "flex", gap: "0.65rem", alignItems: "baseline" }}>
                    <span style={{ fontSize: CONCEPT_TYPE.mono, color: ACCENT.gold, fontWeight: 800 }}>{s.step}</span>
                    <div>
                      <div style={{ fontSize: CONCEPT_TYPE.body, fontWeight: 800, color: "#FAFAFA" }}>{s.title}</div>
                      <div style={{ fontSize: CONCEPT_TYPE.mono, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.body}</div>
                    </div>
                  </div>
                </PremiumGlassCard>
              </motion.div>
            ))}
            <PremiumStat value="7" label="Institutional steps" accent={ACCENT.gold} />
          </motion.div>
        )}

        {act === 3 && (
          <motion.div
            key="rwa3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md mx-auto"
          >
            <SplitCompare
              accent={ACCENT.rose}
              leftLabel="Token only"
              rightLabel="Institution needs"
              left={
                <PremiumGlassCard style={{ padding: "12px 14px", opacity: 0.65 }}>
                  <div style={{ fontSize: CONCEPT_TYPE.body, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>
                    Minted on-chain
                  </div>
                  <div style={{ fontSize: CONCEPT_TYPE.mono, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                    No reusable verify
                  </div>
                </PremiumGlassCard>
              }
              right={
                <PremiumGlassCard accent={ACCENT.rose} glow style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: CONCEPT_TYPE.label, color: ACCENT.rose, fontWeight: 700, marginBottom: 6 }}>
                    STILL ASKED
                  </div>
                  {RWA_INSTITUTION_QUESTIONS.slice(0, 3).map((q, i) => (
                    <div
                      key={q}
                      style={{
                        fontSize: CONCEPT_TYPE.mono,
                        color: actProgress > i * 0.2 ? "#FAFAFA" : "rgba(255,255,255,0.35)",
                        marginTop: i > 0 ? 4 : 0,
                      }}
                    >
                      · {q}
                    </div>
                  ))}
                </PremiumGlassCard>
              }
            />
          </motion.div>
        )}

        {act === 4 && (
          <motion.div
            key="rwa4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto"
          >
            <PremiumGlassCard accent={ACCENT.emerald} glow style={{ width: "100%", textAlign: "center", padding: "16px 18px" }}>
              <div style={{ fontSize: CONCEPT_TYPE.label, letterSpacing: "0.12em", color: ACCENT.emerald, fontWeight: 700 }}>
                VERIFY LAYER
              </div>
              <div style={{ fontSize: CONCEPT_TYPE.hero, fontWeight: 900, color: "#FAFAFA", marginTop: 8 }}>
                Abraxas
              </div>
              <div style={{ fontSize: CONCEPT_TYPE.sub, color: "rgba(255,255,255,0.5)", marginTop: 8, lineHeight: 1.5 }}>
                Verify once · agent.proceed · proof travels with the asset
              </div>
            </PremiumGlassCard>
            <PremiumStat value="→" label="Then tokenize · trade · agent act" accent={ACCENT.emerald} />
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
