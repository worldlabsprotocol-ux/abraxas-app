"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AuthenticationProofArtifact,
  ConnectionBeam,
  CounterpartyVerifierCard,
  ReferenceContextCard,
} from "@/components/home/cinematic/KycDocumentCards";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { CINEMATIC_PROOF_ISSUED_LINE } from "@/lib/intersectionThesis";

const ACT_MS = [5000, 5000, 5000];

const actTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.01 },
  transition: { duration: 0.5, ease: actEase },
};

export function ReferenceProofCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const actLabel =
    act === 1 ? "Reference asset" : act === 2 ? "Verification" : "Proof issued";

  const actCaption =
    act === 1
      ? "Cielo Sunrise — live hospitality reference on Abraxas."
      : act === 2
        ? "Policy decision issues a cryptographic authentication proof."
        : CINEMATIC_PROOF_ISSUED_LINE;

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
      mood={act === 3 ? "success" : "gold"}
      compact={compact}
      minHeight={compact ? 230 : 280}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="r1" {...actTransition} className="flex h-full items-center justify-center">
            <ReferenceContextCard />
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="r2" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3 sm:flex-row">
            <ReferenceContextCard />
            <ConnectionBeam active={actProgress > 0.2} vertical={compact} />
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid rgba(232,197,71,0.35)",
              background: "rgba(232,197,71,0.08)",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.42rem", color: "#F5E6A8",
            }}>
              Decision: Approved
            </div>
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="r3" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3 sm:flex-row">
            <AuthenticationProofArtifact pulse={actProgress < 0.6} hero={!compact} />
            <ConnectionBeam active={actProgress > 0.25} vertical={compact} />
            <CounterpartyVerifierCard label="Independent verifier" active={actProgress > 0.45} />
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
