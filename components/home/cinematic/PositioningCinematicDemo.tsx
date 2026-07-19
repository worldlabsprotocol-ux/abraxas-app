"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { ASSET_POSITIONING_STEPS } from "@/lib/assetPositioning";
import {
  DossierFolder,
  MarketTimeline,
} from "@/components/home/cinematic/DemoVisualPrimitives";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [5000, 5000, 5000];

const actTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.5, ease: actEase },
};

export function PositioningCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const step = ASSET_POSITIONING_STEPS[act - 1];
  const actLabel = step?.title ?? "Position";
  const actCaption = step?.body ?? "";

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
      variant="market"
      compact={compact}
      minHeight={compact ? 240 : 290}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="m1" {...actTransition} className="flex h-full flex-col items-center justify-center gap-5">
            <MarketTimeline
              activeIndex={actProgress > 0.5 ? 1 : 0}
              phases={[
                { year: "Legacy", label: "Quiet tokenize", tone: "muted" },
                { year: "Now", label: "Proof-first", tone: "active" },
                { year: "Window", label: "Act before premium", tone: "future" },
              ]}
            />
            <div style={{
              padding: "12px 16px", borderRadius: 12, width: "100%", maxWidth: 360,
              border: "1px solid rgba(244,114,182,0.3)",
              background: "rgba(244,114,182,0.06)",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.38rem", color: "#F9A8D4", marginBottom: 6 }}>
                STEP 01 · REGISTER
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "#FDF2F8" }}>
                Submit asset · bind wallet · start assurance tiers
              </div>
            </div>
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="m2" {...actTransition} className="flex h-full flex-col items-center justify-center gap-4">
            <DossierFolder
              title="Your ABX record"
              subtitle="ABX-RE-… · monitoring active"
              imageGradient="linear-gradient(135deg, #3b2f4a 0%, #1a1520 50%, #0f172a 100%)"
              stamps={actProgress > 0.3 ? ["REGISTRY-READY", "MONITORING ON"] : []}
            />
            <div style={{ fontFamily: MONO, fontSize: "0.4rem", color: "rgba(251,207,232,0.7)" }}>
              Public record before MLS / token noise
            </div>
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="m3" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3">
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
              width: "100%", maxWidth: 360,
            }}>
              {["Collateral", "Sale", "Tokenize"].map((path, i) => (
                <motion.div
                  key={path}
                  animate={{ opacity: actProgress > i * 0.25 ? 1 : 0.3, y: actProgress > i * 0.25 ? 0 : 8 }}
                  style={{
                    padding: "10px 8px", borderRadius: 10, textAlign: "center",
                    border: "1px solid rgba(244,114,182,0.35)",
                    background: "rgba(244,114,182,0.08)",
                  }}
                >
                  <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, color: "#FDF2F8" }}>{path}</div>
                  <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: "rgba(251,207,232,0.6)", marginTop: 4 }}>
                    credentials travel
                  </div>
                </motion.div>
              ))}
            </div>
            <div style={{
              fontFamily: MONO, fontSize: "0.42rem", color: "#F472B6",
              padding: "6px 12px", borderRadius: 8,
              border: "1px dashed rgba(244,114,182,0.4)",
            }}>
              Exercise when the window opens — not when incumbents allow
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
