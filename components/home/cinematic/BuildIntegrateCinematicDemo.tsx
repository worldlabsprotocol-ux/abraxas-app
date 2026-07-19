"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { CodeBlock, MacTerminalChrome } from "@/components/home/cinematic/DemoVisualPrimitives";

const ACT_MS = [5000, 5500, 5000];

const actTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.45, ease: actEase },
};

export function BuildIntegrateCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const actLabel =
    act === 1 ? "SDK init" : act === 2 ? "Verify call" : "Production path";

  const actCaption =
    act === 1
      ? "Install the verify client — your app never stores raw KYC."
      : act === 2
        ? "POST record_id + policy — Abraxas returns decision fields for your UI."
        : "Ship with webhooks + monitoring — proofs refresh when asset state changes.";

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
      variant="terminal"
      compact={compact}
      minHeight={compact ? 230 : 290}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="t1" {...actTransition} className="flex h-full items-center justify-center">
            <MacTerminalChrome title="integrate — zsh">
              <CodeBlock
                highlightLine={actProgress > 0.35 ? 2 : undefined}
                lines={[
                  "npm install @abraxas/verify-client",
                  "",
                  "const abx = createClient({",
                  "  apiKey: process.env.ABRAXAS_API_KEY",
                  "});",
                ]}
              />
            </MacTerminalChrome>
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="t2" {...actTransition} className="flex h-full items-center justify-center">
            <MacTerminalChrome title="verify.ts">
              <CodeBlock
                highlightLine={actProgress > 0.2 ? 3 : 1}
                lines={[
                  "const res = await abx.verify({",
                  "  record_id: 'ABX-RE-HOSP-001',",
                  "  policy: 'cielo-guest-v1',",
                  "});",
                  "",
                  "// res.decision · res.proof_id · res.verify_url",
                ]}
              />
            </MacTerminalChrome>
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="t3" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3">
            <MacTerminalChrome title="webhooks — production">
              <CodeBlock
                highlightLine={actProgress > 0.25 ? 4 : 2}
                lines={[
                  "POST /your-app/webhooks/abraxas",
                  "{",
                  "  \"event\": \"asset.state_changed\",",
                  "  \"action\": \"refresh_proof_required\"",
                  "}",
                ]}
              />
            </MacTerminalChrome>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.38rem",
              color: "rgba(52,211,153,0.75)", textAlign: "center",
            }}>
              abx_live_ keys · partner portal · relying-party program
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
