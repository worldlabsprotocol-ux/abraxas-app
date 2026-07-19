"use client";

import { AnimatePresence, motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { BrowserVerifierFrame } from "@/components/home/cinematic/DemoVisualPrimitives";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [4500, 5000, 4500];

const CHECK_STEPS = [
  "Fetch payload + signature",
  "Load Abraxas public key",
  "Ed25519 verify locally",
  "Check proof_status / anchor",
];

const actTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
  transition: { duration: 0.45, ease: actEase },
};

export function IndependentVerifyCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const checksLit = Math.min(CHECK_STEPS.length, Math.floor(actProgress * (CHECK_STEPS.length + 1)));

  const actLabel =
    act === 1 ? "Public verifier" : act === 2 ? "Crypto check" : "Trust the math";

  const actCaption =
    act === 1
      ? "Paste any aprx_ proof ID — no sign-in, no Abraxas account."
      : act === 2
        ? "Verifier runs signature check with published public key."
        : "Valid or invalid — determined locally. Servers are not in the trust path.";

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
      variant="auditor"
      compact={compact}
      minHeight={compact ? 240 : 290}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="a1" {...actTransition} className="flex h-full items-center justify-center">
            <BrowserVerifierFrame url="abraxas.app/api/proof/aprx_7f3a9c2e…">
              <div style={{ marginBottom: 10, fontFamily: MONO, fontSize: "0.38rem", color: "rgba(255,255,255,0.45)" }}>
                Independent proof lookup
              </div>
              <div style={{
                padding: "8px 10px", borderRadius: 6, marginBottom: 10,
                border: "1px solid rgba(16,185,129,0.35)", background: "rgba(0,0,0,0.35)",
                fontFamily: MONO, fontSize: "0.42rem", color: "#6EE7B7",
              }}>
                aprx_7f3a9c2e1b4d8f6a
              </div>
              <motion.div
                animate={{ opacity: actProgress > 0.5 ? 1 : 0.4 }}
                style={{
                  padding: "6px 12px", borderRadius: 6, display: "inline-block",
                  background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)",
                  fontFamily: MONO, fontSize: "0.36rem", color: "#A7F3D0", fontWeight: 700,
                }}
              >
                Verify proof →
              </motion.div>
            </BrowserVerifierFrame>
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="a2" {...actTransition} className="flex h-full flex-col items-center justify-center gap-2">
            {CHECK_STEPS.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: i < checksLit ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", maxWidth: 320, padding: "6px 10px", borderRadius: 8,
                  border: `1px solid ${i < checksLit ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: i < checksLit ? "rgba(16,185,129,0.08)" : "transparent",
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: 4, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: "0.55rem", fontWeight: 800,
                  background: i < checksLit ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)",
                  color: i < checksLit ? "#6EE7B7" : "rgba(255,255,255,0.3)",
                }}>
                  {i < checksLit ? "✓" : "·"}
                </span>
                <span style={{ fontFamily: MONO, fontSize: "0.4rem", color: i < checksLit ? "#D1FAE5" : "rgba(255,255,255,0.4)" }}>
                  {step}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="a3" {...actTransition} className="flex h-full flex-col items-center justify-center gap-4">
            <div style={{
              padding: "14px 20px", borderRadius: 12, textAlign: "center",
              border: "2px solid rgba(16,185,129,0.5)",
              background: "linear-gradient(180deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))",
              boxShadow: "0 0 40px rgba(16,185,129,0.2)",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 800, color: "#6EE7B7", letterSpacing: "0.08em" }}>
                SIGNATURE VALID
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.36rem", color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
                public_key published · proof_reliable: true
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.34rem", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
              No inbox · no relay · verify without trusting our servers
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
