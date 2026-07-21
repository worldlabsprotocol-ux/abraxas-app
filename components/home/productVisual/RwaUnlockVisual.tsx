"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthenticationProofArtifact } from "@/components/home/cinematic/KycDocumentCards";
import {
  BigLabel,
  GlowOrb,
  MicroLabel,
  ProductVisualFrame,
  StepDots,
} from "./ProductVisualPrimitives";
import { COSMIC_PALETTE, DEMO_MOTION, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import { DASHBOARD_ASSETS, UNLOCK_VISUAL_STEPS } from "@/lib/productVisualDemo";

const STEP_MS = 3500;

function AssetTile({
  name,
  type,
  value,
  accent,
  icon,
  lit,
}: {
  name: string;
  type: string;
  value: string;
  accent: string;
  icon: string;
  lit: boolean;
}) {
  return (
    <motion.div
      animate={{
        opacity: lit ? 1 : 0.35,
        scale: lit ? 1 : 0.94,
        boxShadow: lit ? `0 0 24px ${accent}44` : "none",
      }}
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid ${lit ? accent : "rgba(255,255,255,0.1)"}`,
        background: lit ? `${accent}12` : "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
      }}
    >
      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      <div>
        <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "0.82rem", fontWeight: 800, color: "#FAFAFA" }}>
          {name}
        </div>
        <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.58rem", color: COSMIC_PALETTE.textMuted }}>
          {type} · {value}
        </div>
      </div>
      {lit && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{ marginLeft: "auto", color: accent, fontWeight: 900, fontSize: "0.7rem" }}
        >
          ✓
        </motion.span>
      )}
    </motion.div>
  );
}

export function RwaUnlockVisual() {
  const [step, setStep] = useState(0);
  const current = UNLOCK_VISUAL_STEPS[step];
  const accent = COSMIC_PALETTE.emerald;

  useEffect(() => {
    const t = window.setInterval(() => setStep(s => (s + 1) % UNLOCK_VISUAL_STEPS.length), STEP_MS);
    return () => window.clearInterval(t);
  }, []);

  return (
    <ProductVisualFrame mesh="emerald" accent={accent}>
      <MicroLabel accent={accent}>02 · RWA unlock</MicroLabel>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: DEMO_MOTION.easeOut }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1, justifyContent: "center", gap: 12 }}
        >
          {current.id === "locked" && (
            <>
              <GlowOrb accent={COSMIC_PALETTE.rose} icon="⛓" pulse />
              <BigLabel>Gated</BigLabel>
              <MicroLabel>Policy · consent</MicroLabel>
            </>
          )}
          {current.id === "proof" && (
            <>
              <AuthenticationProofArtifact hero issued pulse proofId="aprx_cielo_sunrise" />
              <BigLabel accent={accent}>Proof</BigLabel>
              <MicroLabel>Anyone verifies</MicroLabel>
            </>
          )}
          {current.id === "unlocked" && (
            <>
              <BigLabel accent={accent}>Unlocked</BigLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 8 }}>
                {DASHBOARD_ASSETS.map((a, i) => (
                  <AssetTile
                    key={a.id}
                    name={a.name}
                    type={a.type}
                    value={a.yield}
                    accent={a.accent}
                    icon={a.icon}
                    lit
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <StepDots total={UNLOCK_VISUAL_STEPS.length} active={step} accent={accent} />
    </ProductVisualFrame>
  );
}
