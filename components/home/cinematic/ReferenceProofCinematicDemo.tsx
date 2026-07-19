"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import {
  AssetHeroCard,
  PremiumGlassCard,
  VerifyResultHero,
} from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT } from "@/components/home/cinematic/demoPremium";

const ACT_MS = [4500, 5000, 4500];

const CHECKS = ["Guest policy attested", "Operator credentialing", "USDC settlement path", "Monitoring active"];

export function ReferenceProofCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount, actProgress } = useCinematicTimer(ACT_MS);

  const captions = [
    "Cielo Sunrise — live hospitality reference in production.",
    "Diligence complete. Policy scope attested on Abraxas.",
    "ABX-RE-HOSP-001 — publicly verifiable case study.",
  ];
  const labels = ["Live asset", "Diligence", "On registry"];

  const checksDone = Math.min(CHECKS.length, Math.floor(actProgress * (CHECKS.length + 1)));

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="dossier"
      compact={compact}
      minHeight={compact ? 250 : 300}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="r1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <AssetHeroCard
              title="Cielo Sunrise"
              id="ABX-RE-HOSP-001"
              location="Mineral Bluff, Georgia"
              gradient="linear-gradient(135deg, #1e3a32 0%, #0f1f1a 50%, #0a1410 100%)"
              badge="LIVE REFERENCE"
            />
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="r2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-auto w-full max-w-sm"
          >
            <PremiumGlassCard accent={ACCENT.gold}>
              {CHECKS.map((c, i) => (
                <motion.div
                  key={c}
                  animate={{ opacity: i < checksDone ? 1 : 0.3 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0", fontSize: "0.72rem", fontWeight: 700, color: "#FAFAFA",
                    borderBottom: i < CHECKS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                  }}
                >
                  <span style={{ color: i < checksDone ? "#6EE7B7" : "rgba(255,255,255,0.2)" }}>
                    {i < checksDone ? "✓" : "○"}
                  </span>
                  {c}
                </motion.div>
              ))}
            </PremiumGlassCard>
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="r3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <PremiumGlassCard accent={ACCENT.gold} glow style={{ textAlign: "center", maxWidth: 320, width: "100%" }}>
              <div style={{ fontSize: "0.48rem", letterSpacing: "0.14em", color: ACCENT.gold, fontWeight: 800, marginBottom: 8 }}>
                PRODUCTION RECORD
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#FAFAFA" }}>ABX-RE-HOSP-001</div>
              <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.45)", marginTop: 10 }}>
                /verify · /case-studies/cielo
              </div>
            </PremiumGlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
