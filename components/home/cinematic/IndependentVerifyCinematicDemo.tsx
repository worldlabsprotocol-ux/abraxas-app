"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import {
  ClaimRow,
  PremiumGlassCard,
  VerifyResultHero,
} from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT } from "@/components/home/cinematic/demoPremium";

const ACT_MS = [4500, 5000, 4500];

const CLAIMS = [
  { label: "proof_id", value: "aprx_7f3a9c2e…", redacted: false },
  { label: "signature_valid", value: "true", redacted: false },
  { label: "public_key", value: "published", redacted: false },
  { label: "anchor_status", value: "signed", redacted: false },
];

export function IndependentVerifyCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount, actProgress } = useCinematicTimer(ACT_MS);

  const captions = [
    "Anyone pastes a proof ID. No account. No Abraxas login.",
    "Verifier checks Ed25519 signature with the published public key.",
    "Valid or invalid — determined on your machine. Not our servers.",
  ];
  const labels = ["Lookup", "Verify", "Trust math"];

  const revealed = act === 1 ? 1 : act === 2 ? 3 : 4;

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="auditor"
      compact={compact}
      minHeight={compact ? 240 : 290}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="v1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <PremiumGlassCard accent={ACCENT.emerald} glow style={{ width: "100%", maxWidth: 360 }}>
              <div style={{ fontSize: "0.48rem", letterSpacing: "0.12em", color: ACCENT.emerald, marginBottom: 12, fontWeight: 700 }}>
                PUBLIC VERIFIER
              </div>
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(0,0,0,0.35)", border: "1px solid rgba(52,211,153,0.25)",
                fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", color: "#6EE7B7",
              }}>
                aprx_7f3a9c2e1b4d8f6a
              </div>
              <motion.div
                animate={{ opacity: actProgress > 0.5 ? 1 : 0.5 }}
                style={{
                  marginTop: 14, padding: "10px", borderRadius: 8, textAlign: "center",
                  background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)",
                  fontSize: "0.62rem", fontWeight: 800, color: "#A7F3D0",
                }}
              >
                Verify independently →
              </motion.div>
            </PremiumGlassCard>
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="v2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-auto w-full max-w-sm"
          >
            <PremiumGlassCard>
              {CLAIMS.map((c, i) => (
                <ClaimRow key={c.label} label={c.label} value={c.value} visible={i < revealed} />
              ))}
            </PremiumGlassCard>
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="v3" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <VerifyResultHero valid />
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
