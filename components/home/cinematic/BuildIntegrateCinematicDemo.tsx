"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AuthenticationProofArtifact,
  CounterpartyVerifierCard,
  NoRelayBadge,
} from "@/components/home/cinematic/KycDocumentCards";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { INSTITUTIONAL_GOLD, INSTITUTIONAL_VIOLET } from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [5500, 5500, 5500];

function ApiTerminal({
  method,
  path,
  highlight,
  response,
}: {
  method: string;
  path: string;
  highlight?: boolean;
  response?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 340,
        borderRadius: 12,
        border: `1px solid ${highlight ? "rgba(232,197,71,0.45)" : "rgba(255,255,255,0.1)"}`,
        background: "linear-gradient(165deg, rgba(14,12,20,0.98), rgba(6,6,10,0.99))",
        boxShadow: highlight ? "0 0 28px rgba(232,197,71,0.15)" : "0 16px 40px rgba(0,0,0,0.45)",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <span style={{ fontFamily: MONO, fontSize: "0.42rem", color: INSTITUTIONAL_GOLD, fontWeight: 700 }}>
          {method}
        </span>
        <span style={{ fontFamily: MONO, fontSize: "0.4rem", color: "rgba(255,255,255,0.55)" }}>
          {path}
        </span>
      </div>
      {response && (
        <pre style={{
          margin: 0, padding: "10px 11px",
          fontFamily: MONO, fontSize: "0.38rem", lineHeight: 1.55,
          color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap",
        }}>
          {response}
        </pre>
      )}
    </div>
  );
}

function PartnerAppCard({ name, pulse }: { name: string; pulse?: boolean }) {
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.02, 1] } : undefined}
      transition={pulse ? { duration: 1.6, repeat: Infinity } : undefined}
      style={{
        width: "100%", maxWidth: 200, padding: "12px 14px", borderRadius: 12,
        border: `1px solid ${INSTITUTIONAL_VIOLET}55`,
        background: "linear-gradient(160deg, rgba(22,18,30,0.98), rgba(8,8,14,0.99))",
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: "0.34rem", color: INSTITUTIONAL_VIOLET, marginBottom: 6 }}>
        YOUR APPLICATION
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "#FAFAFA" }}>
        {name}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.42rem", color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
        Needs verified guest / asset proof
      </div>
    </motion.div>
  );
}

const actTransition = {
  initial: { opacity: 0, filter: "blur(8px)", scale: 0.99 },
  animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
  exit: { opacity: 0, filter: "blur(6px)", scale: 1.01 },
  transition: { duration: 0.55, ease: actEase },
};

export function BuildIntegrateCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const actLabel =
    act === 1 ? "Embed verify" : act === 2 ? "Proof returned" : "Independent check";

  const actCaption =
    act === 1
      ? "Your app calls Abraxas — no KYC stack to rebuild."
      : act === 2
        ? "Decision receipt + cryptographic authentication proof in the response."
        : "Any relying party verifies the proof at GET /api/proof/[id].";

  const mood = act === 1 ? "violet" : act === 2 ? "gold" : "success";

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
      mood={mood}
      compact={compact}
      minHeight={compact ? 220 : 280}
    >
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div key="a1" {...actTransition} className="flex h-full flex-col items-center justify-center gap-4">
            <PartnerAppCard name="Cielo operator portal" pulse={actProgress > 0.2} />
            <ApiTerminal
              method="POST"
              path="/api/credentials/verify"
              highlight={actProgress > 0.35}
            />
          </motion.div>
        )}
        {act === 2 && (
          <motion.div key="a2" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3">
            <ApiTerminal
              method="200"
              path="verify response"
              highlight
              response={`{
  "decision": "approved",
  "proof_id": "aprx_7f3a9c2e…",
  "verify_url": "/api/proof/aprx_…",
  "authentication_proof": { … }
}`}
            />
            <AuthenticationProofArtifact pulse={actProgress > 0.25 && actProgress < 0.75} />
          </motion.div>
        )}
        {act === 3 && (
          <motion.div key="a3" {...actTransition} className="flex h-full flex-col items-center justify-center gap-3">
            <ApiTerminal
              method="GET"
              path="/api/proof/aprx_7f3a9c2e…"
              highlight={actProgress > 0.15}
              response={`{
  "signature_valid": true,
  "anchor_status": "signed",
  "proof_status": "active"
}`}
            />
            <CounterpartyVerifierCard label="Relying party" active={actProgress > 0.4} />
            {actProgress > 0.55 && <NoRelayBadge />}
          </motion.div>
        )}
      </AnimatePresence>
    </CinematicDemoShell>
  );
}
