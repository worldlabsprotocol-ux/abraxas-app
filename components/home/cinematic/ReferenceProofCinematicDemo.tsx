"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { DossierFolder } from "@/components/home/cinematic/DemoVisualPrimitives";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [5000, 5000, 5000];

const DILIGENCE = [
  "Guest policy attestation",
  "STR / operator credentialing",
  "USDC settlement path",
  "Monitoring feed active",
];

const actTransition = {
  initial: { opacity: 0, rotateX: 8 },
  animate: { opacity: 1, rotateX: 0 },
  exit: { opacity: 0, rotateX: -6 },
  transition: { duration: 0.5, ease: actEase },
};

export function ReferenceProofCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const checksDone = Math.min(DILIGENCE.length, Math.floor(actProgress * (DILIGENCE.length + 0.5)));

  const actLabel =
    act === 1 ? "Live asset" : act === 2 ? "Diligence" : "On registry";

  const actCaption =
    act === 1
      ? "Cielo Sunrise — hospitality reference asset in production."
      : act === 2
        ? "Assurance tiers and operator policies — attested, not re-uploaded."
        : "ABX-RE-HOSP-001 is publicly verifiable — case study + verify path.";

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
      variant="dossier"
      compact={compact}
      minHeight={compact ? 250 : 300}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="d1" {...actTransition} className="flex h-full items-center justify-center">
            <DossierFolder
              title="Cielo Sunrise"
              subtitle="ABX-RE-HOSP-001 · Mineral Bluff, GA"
              imageGradient="linear-gradient(135deg, #2d4a3e 0%, #1a2e28 40%, #0f1a16 100%)"
            />
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="d2" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3">
            <div style={{
              width: "100%", maxWidth: 320, padding: "12px 14px", borderRadius: 10,
              border: "1px solid rgba(251,191,36,0.25)", background: "rgba(0,0,0,0.35)",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.38rem", color: "#FCD34D", marginBottom: 10 }}>
                DILIGENCE CHECKLIST
              </div>
              {DILIGENCE.map((item, i) => (
                <motion.div
                  key={item}
                  animate={{ opacity: i < checksDone ? 1 : 0.35 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                    fontFamily: FONT, fontSize: "0.62rem", color: "#FAFAFA",
                  }}
                >
                  <span style={{ color: i < checksDone ? "#6EE7B7" : "rgba(255,255,255,0.25)" }}>
                    {i < checksDone ? "✓" : "○"}
                  </span>
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="d3" {...actTransition} className="flex h-full flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: actProgress > 0.3 ? -8 : 0 }}
              style={{
                padding: "12px 20px", borderRadius: 8,
                border: "3px double rgba(251,191,36,0.5)",
                fontFamily: MONO, fontSize: "0.48rem", fontWeight: 800,
                color: "#FDE68A", letterSpacing: "0.12em",
                background: "rgba(251,191,36,0.08)",
              }}
            >
              LIVE REFERENCE
            </motion.div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "#FAFAFA" }}>
                ABX-RE-HOSP-001
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.4rem", color: "rgba(251,191,36,0.75)", marginTop: 6 }}>
                /verify/ABX-RE-HOSP-001 · /case-studies/cielo
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
