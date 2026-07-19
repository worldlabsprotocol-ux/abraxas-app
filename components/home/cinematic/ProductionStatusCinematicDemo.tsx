"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import {
  PremiumGlassCard,
  PremiumStat,
  SplitCompare,
} from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT } from "@/components/home/cinematic/demoPremium";
import { ASSET_POSITIONING_BODY } from "@/lib/assetPositioning";
import {
  HOMEPAGE_STATUS_LEAD,
  HOMEPAGE_STATUS_ROLLOUT,
} from "@/lib/currentStatus";
import { mainnetReadinessProgress } from "@/lib/mainnetReadiness";

const ACT_MS = [5500, 5500, 6000];

const LOOP_STEPS = [
  { label: "Verify", sub: "Assurance tiers your counterparties need" },
  { label: "Registry-ready", sub: "ABX record · monitoring on" },
  { label: "Tokenize", sub: "When you choose — not incumbents" },
];

export function ProductionStatusCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount, actProgress } = useCinematicTimer(ACT_MS);
  const { done, total } = mainnetReadinessProgress();

  const captions = [
    "Legacy assets tokenize quietly — then pay a premium to act.",
    "Abraxas closes the loop: verify, registry-ready, tokenize on your timeline.",
    HOMEPAGE_STATUS_LEAD,
  ];
  const labels = ["Legacy trap", "Close the loop", "Live today"];

  const stepsLit = Math.min(LOOP_STEPS.length, Math.floor(actProgress * 4));

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="default"
      compact={compact}
      minHeight={compact ? 240 : 290}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: actEase }}
            className="flex flex-col items-center gap-5"
          >
            <SplitCompare
              accent={ACCENT.gold}
              leftLabel="Incumbents"
              rightLabel="Your window"
              left={
                <PremiumGlassCard style={{ opacity: 0.55, padding: "16px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 900, color: "rgba(255,255,255,0.45)" }}>
                    Tokenize quietly
                  </div>
                  <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                    Premium to act later
                  </div>
                </PremiumGlassCard>
              }
              right={
                <PremiumGlassCard accent={ACCENT.gold} glow style={{ padding: "16px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 900, color: "#FAFAFA" }}>
                    Position now
                  </div>
                  <div style={{ fontSize: "0.58rem", color: ACCENT.gold, marginTop: 8 }}>
                    Proof-first · registry-ready
                  </div>
                </PremiumGlassCard>
              }
            />
            <p style={{
              fontFamily: "'Inter',sans-serif", fontSize: "0.62rem", color: "rgba(255,255,255,0.4)",
              textAlign: "center", maxWidth: 400, lineHeight: 1.55, margin: 0,
            }}>
              {ASSET_POSITIONING_BODY.split(".")[0]}.
            </p>
          </motion.div>
        )}

        {act === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto grid w-full max-w-lg grid-cols-3 gap-3"
          >
            {LOOP_STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                animate={{
                  opacity: i < stepsLit ? 1 : 0.3,
                  y: i < stepsLit ? 0 : 10,
                }}
              >
                <PremiumGlassCard
                  accent={i < stepsLit ? ACCENT.gold : undefined}
                  glow={i === stepsLit - 1}
                  style={{ padding: "14px 12px", textAlign: "center", height: "100%" }}
                >
                  <div style={{ fontSize: "0.48rem", letterSpacing: "0.1em", color: ACCENT.gold, fontWeight: 800, marginBottom: 6 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#FAFAFA" }}>{step.label}</div>
                  <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.45)", marginTop: 6, lineHeight: 1.4 }}>
                    {step.sub}
                  </div>
                </PremiumGlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {act === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex flex-wrap justify-center gap-3">
              <PremiumStat value="LIVE" label="Verification + Passport" accent={ACCENT.emerald} pulse />
              <PremiumStat value={`${done}/${total}`} label="Mainnet gates" accent={ACCENT.gold} />
            </div>
            <PremiumGlassCard accent={ACCENT.gold} style={{ maxWidth: 420, textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                {HOMEPAGE_STATUS_ROLLOUT}
              </div>
            </PremiumGlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
