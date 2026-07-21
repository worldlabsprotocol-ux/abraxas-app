"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AbraxasPassportVc } from "@/components/home/cinematic/KycDocumentCards";
import {
  BigLabel,
  FlowArrow,
  GlowOrb,
  MicroLabel,
  ProductVisualFrame,
  StepDots,
} from "./ProductVisualPrimitives";
import { COSMIC_PALETTE, DEMO_MOTION } from "@/lib/demoDesignSystem";
import { PASSPORT_VISUAL_STEPS } from "@/lib/productVisualDemo";

const STEP_MS = 3200;

export function PassportFlowVisual() {
  const [step, setStep] = useState(0);
  const current = PASSPORT_VISUAL_STEPS[step];
  const accent = COSMIC_PALETTE.violet;

  useEffect(() => {
    const t = window.setInterval(() => setStep(s => (s + 1) % PASSPORT_VISUAL_STEPS.length), STEP_MS);
    return () => window.clearInterval(t);
  }, []);

  return (
    <ProductVisualFrame mesh="violet" accent={accent}>
      <MicroLabel accent={accent}>01 · Passport</MicroLabel>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: DEMO_MOTION.easeOut }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}
        >
          {current.id === "wallet" && (
            <>
              <GlowOrb accent={COSMIC_PALETTE.cyan} icon="◈" />
              <BigLabel accent={COSMIC_PALETTE.cyan}>Connect</BigLabel>
              <MicroLabel>Sui zkLogin</MicroLabel>
              <FlowArrow accent={COSMIC_PALETTE.cyan} />
            </>
          )}
          {current.id === "kyc" && (
            <>
              <GlowOrb accent={accent} icon="✓" />
              <BigLabel accent={accent}>Verify ID</BigLabel>
              <motion.div
                style={{
                  width: 160,
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "easeOut" }}
                  style={{ height: "100%", background: `linear-gradient(90deg, ${accent}, ${COSMIC_PALETTE.cyan})` }}
                />
              </motion.div>
              <MicroLabel>Veriff · 90s</MicroLabel>
            </>
          )}
          {current.id === "credential" && (
            <>
              <AbraxasPassportVc pulse large merge />
              <div style={{ marginTop: 16 }}>
                <BigLabel accent={COSMIC_PALETTE.gold}>Issued</BigLabel>
              </div>
              <MicroLabel>W3C · portable</MicroLabel>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <StepDots total={PASSPORT_VISUAL_STEPS.length} active={step} accent={accent} />
    </ProductVisualFrame>
  );
}
