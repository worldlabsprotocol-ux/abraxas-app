"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { PolicyClaimsCard } from "@/components/home/cinematic/DemoVisualPrimitives";

const ACT_MS = [5000, 5000, 5000];

const CLAIMS = [
  { key: "decision", value: "Approved" },
  { key: "policy", value: "Cielo Verified Guest v1" },
  { key: "wallet_binding", value: "Active" },
  { key: "passport_selfie", value: "hidden", sensitive: true },
  { key: "government_id", value: "hidden", sensitive: true },
  { key: "consent", value: "Current" },
  { key: "valid_until", value: "2026-12-31" },
];

const actTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.45, ease: actEase },
};

export function PolicyClaimsCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const revealed =
    act === 1 ? 2 : act === 2 ? 5 : CLAIMS.length;

  const actLabel =
    act === 1 ? "Policy match" : act === 2 ? "Redacted" : "Decision out";

  const actCaption =
    act === 1
      ? "Relying party requests a policy — Abraxas evaluates claims."
      : act === 2
        ? "Raw biometrics and documents stay redacted — only approved claims ship."
        : "Counterparty receives the minimum proof their policy requires.";

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
      variant="policy"
      compact={compact}
      minHeight={compact ? 240 : 280}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={act}
          {...actTransition}
          className="flex h-full flex-col items-center justify-center gap-3"
        >
          <PolicyClaimsCard
            claims={CLAIMS.map(c => ({
              key: c.key,
              value: c.sensitive ? "████" : c.value,
              sensitive: c.sensitive,
            }))}
            revealed={revealed}
          />
          {act === 3 && actProgress > 0.5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                padding: "8px 14px", borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.35)",
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "0.4rem", fontWeight: 700, color: "#E2E8F0",
              }}
            >
              DECISION: APPROVED · audit ref only
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
