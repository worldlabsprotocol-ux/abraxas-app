"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AppVerificationPortal, DuplicateArrows, IdentitySourceScreen } from "@/components/home/cinematic/KycDocumentCards";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { ASSET_POSITIONING_HEADLINE } from "@/lib/assetPositioning";

const ACT_MS = [5500, 5500];

const PORTALS = [
  { name: "RWA marketplace", context: "List now", accent: "violet" as const },
  { name: "Lender portal", context: "Underwrite", accent: "gold" as const },
];

const actTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.5, ease: actEase },
};

export function PositioningCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const actLabel = act === 1 ? "Tokenize now" : "Proof travels";
  const actCaption =
    act === 1
      ? ASSET_POSITIONING_HEADLINE
      : "Cryptographic proof persists — chains and apps diverge, verification does not.";

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
      mood={act === 1 ? "danger" : "success"}
      compact={compact}
      minHeight={compact ? 220 : 260}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="p1" {...actTransition} className="flex flex-col items-center gap-3">
            <div style={{
              fontFamily: "'Inter',sans-serif", fontSize: "0.72rem", fontWeight: 800,
              color: "#FCA5A5", letterSpacing: "0.04em",
            }}>
              EVERY PLATFORM REBUILDS TRUST FROM ZERO
            </div>
            <div className="grid w-full max-w-md grid-cols-2 gap-2">
              {PORTALS.map((p, i) => (
                <AppVerificationPortal
                  key={p.name}
                  name={p.name}
                  context={p.context}
                  accent={p.accent}
                  pulse={Math.floor(actProgress * 4) % 2 === i}
                  showModal={actProgress > 0.3 && i === 0}
                  uploadN={3}
                />
              ))}
            </div>
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="p2" {...actTransition} className="flex flex-col items-center gap-3">
            <IdentitySourceScreen copies={3} />
            <DuplicateArrows active={actProgress > 0.15} />
            <div style={{
              padding: "8px 12px", borderRadius: 10,
              border: "1px solid rgba(16,185,129,0.4)",
              background: "rgba(16,185,129,0.1)",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.42rem", color: "#6EE7B7", fontWeight: 700,
            }}>
              aprx_… · independently verifiable on any chain
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
