"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { ApiGlowPanel, PremiumGlassCard } from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT, CONCEPT_TYPE } from "@/components/home/cinematic/demoPremium";

const ACT_MS = [5000, 5500, 5000];

export function BuildIntegrateCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount, actProgress } = useCinematicTimer(ACT_MS);

  const captions = [
    "One API key. No KYC stack to rebuild.",
    "POST verify — decision + proof_id in the response.",
    "Webhooks fire when asset state changes. Proofs refresh automatically.",
  ];
  const labels = ["Integrate", "Verify", "Ship"];

  const litField = act === 2 ? Math.min(3, Math.floor(actProgress * 4)) : act === 3 ? 2 : undefined;

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="terminal"
      compact={compact}
      minHeight={compact ? 230 : 290}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="b1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex h-full items-center justify-center"
          >
            <PremiumGlassCard accent={ACCENT.emerald} glow style={{ maxWidth: 360, width: "100%" }}>
              <div style={{ fontSize: CONCEPT_TYPE.label, letterSpacing: "0.12em", color: ACCENT.emerald, fontWeight: 700, marginBottom: 12 }}>
                DEVELOPER PATH
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: CONCEPT_TYPE.mono, lineHeight: 1.8, color: "rgba(255,255,255,0.7)" }}>
                <span style={{ color: ACCENT.emerald }}>→</span> npm install @abraxas/verify-client<br />
                <span style={{ color: actProgress > 0.4 ? ACCENT.emerald : "rgba(255,255,255,0.3)" }}>→</span> abx_live_ API key<br />
                <span style={{ color: actProgress > 0.7 ? ACCENT.emerald : "rgba(255,255,255,0.3)" }}>→</span> embed in your app
              </div>
            </PremiumGlassCard>
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="b2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex h-full items-center justify-center"
          >
            <ApiGlowPanel
              method="POST"
              path="/api/credentials/verify"
              litField={litField}
              fields={[
                { key: "decision", value: '"approved"' },
                { key: "proof_id", value: '"aprx_7f3a…"' },
                { key: "verify_url", value: '"/api/proof/…"' },
                { key: "decision_receipt", value: "{ … }" },
              ]}
            />
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="b3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex h-full items-center justify-center"
          >
            <ApiGlowPanel
              method="WEBHOOK"
              path="asset.state_changed"
              litField={litField}
              fields={[
                { key: "event", value: '"state_changed"' },
                { key: "action", value: '"refresh_proof"' },
                { key: "asset_id", value: '"ABX-RE-…"' },
              ]}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
