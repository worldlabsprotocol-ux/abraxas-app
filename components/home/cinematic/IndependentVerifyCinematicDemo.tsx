"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AuthenticationProofArtifact,
  NoRelayBadge,
} from "@/components/home/cinematic/KycDocumentCards";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [4500, 4500, 4500];

function ProofLookupTerminal({
  highlight,
  showResult,
}: {
  highlight?: boolean;
  showResult?: boolean;
}) {
  return (
    <div style={{
      width: "100%", maxWidth: 360, borderRadius: 12,
      border: `1px solid ${highlight ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.1)"}`,
      background: "linear-gradient(165deg, rgba(14,12,20,0.98), rgba(6,6,10,0.99))",
      overflow: "hidden",
    }}>
      <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontFamily: MONO, fontSize: "0.4rem", color: "rgba(255,255,255,0.55)" }}>
          GET /api/proof/aprx_7f3a9c2e1b4d8f6a
        </span>
      </div>
      <pre style={{
        margin: 0, padding: "10px 11px",
        fontFamily: MONO, fontSize: "0.38rem", lineHeight: 1.55,
        color: "rgba(255,255,255,0.7)",
      }}>
        {showResult
          ? `{
  "proof_id": "aprx_7f3a9c2e…",
  "signature_valid": true,
  "public_key": "…",
  "anchor_status": "signed",
  "proof_reliable": true
}`
          : `{ "loading": true }`}
      </pre>
    </div>
  );
}

const actTransition = {
  initial: { opacity: 0, filter: "blur(8px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(6px)" },
  transition: { duration: 0.5, ease: actEase },
};

export function IndependentVerifyCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const actLabel =
    act === 1 ? "Proof ID" : act === 2 ? "Self-verify" : "Anyone can check";

  const actCaption =
    act === 1
      ? "Every decision returns a portable proof ID — aprx_…"
      : act === 2
        ? "GET /api/proof/[id] returns signature, public key, and validity."
        : "No inbox relay. No trust in Abraxas servers required.";

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
      minHeight={compact ? 220 : 270}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="v1" {...actTransition} className="flex h-full items-center justify-center">
            <AuthenticationProofArtifact pulse hero={!compact} />
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="v2" {...actTransition} className="flex h-full items-center justify-center">
            <ProofLookupTerminal highlight showResult={actProgress > 0.25} />
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="v3" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3">
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(16,185,129,0.45)",
              background: "rgba(16,185,129,0.12)",
              fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
              color: "#6EE7B7", letterSpacing: "0.06em",
            }}>
              signature_valid: true · proof_reliable: true
            </div>
            <NoRelayBadge />
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
